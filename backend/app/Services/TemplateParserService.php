<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use PhpOffice\PhpSpreadsheet\IOFactory;

class TemplateParserService
{
    public function parse(string $filePath, string $projectType): array
    {
        $mtime    = file_exists($filePath) ? filemtime($filePath) : 0;
        // v2: columns are read by header name; v1 entries cached a wrong result for projects with several types.
        $cacheKey = 'quotation_schema_v2_' . md5($filePath . $projectType) . '_' . $mtime;

        return Cache::remember($cacheKey, now()->addDay(), function () use ($filePath, $projectType) {
            return $this->doParse($filePath, $projectType);
        });
    }

    private function doParse(string $filePath, string $projectType): array
    {
        $spreadsheet = IOFactory::load($filePath);

        $allSheets = [];
        foreach ($spreadsheet->getSheetNames() as $index => $name) {
            $allSheets[$name] = $spreadsheet->getSheet($index)->toArray(null, true, true, false);
        }

        foreach (['FIELDS', 'CONFIG', 'SELECT'] as $required) {
            if (!isset($allSheets[$required])) {
                throw new \Exception("Missing sheet: {$required}");
            }
        }

        $projectTypes = array_values(array_filter(array_map('trim', explode(',', $projectType)), 'strlen'));

        $dropdownMap = $this->parseSelectSheet($this->rowsByHeader($allSheets['SELECT']));
        $configMap   = $this->parseConfigSheet($this->rowsByHeader($allSheets['CONFIG']), $dropdownMap, $projectTypes);

        return $this->parseFieldSheet($this->rowsByHeader($allSheets['FIELDS']), $dropdownMap, $configMap, $projectTypes);
    }

    /**
     * Each row keyed by its column's header. The templates do not share a column order:
     * operations_template has no "placeholder" column in CONFIG, so positions would shift.
     */
    private function rowsByHeader(array $rows): array
    {
        $header = array_map(fn ($name) => strtolower(trim((string) $name)), array_shift($rows) ?? []);

        return array_map(function (array $row) use ($header) {
            $named = [];
            foreach ($header as $position => $name) {
                if ($name !== '') {
                    $named[$name] = $row[$position] ?? null;
                }
            }

            return $named;
        }, $rows);
    }

    /**
     * A field is shown when any of the project's types is listed in its project_types cell
     * ("CLT, F2F"); a project usually has one type but can have several.
     */
    private function isHidden(array $projectTypes, mixed $cell): bool
    {
        $fieldTypes = array_map('trim', explode(',', (string) $cell));

        return count(array_intersect($projectTypes, $fieldTypes)) === 0;
    }

    private function parseSelectSheet(array $rows): array
    {
        $map = [];

        foreach ($rows as $row) {
            $key   = $row['key'] ?? null;
            $value = $row['value'] ?? null;
            $label = $row['label'] ?? null;

            if (!$key || !$value || !$label) continue;

            $map[$key][] = [
                'value' => trim((string) $value),
                'label' => trim((string) $label),
            ];
        }

        return $map;
    }

    private function parseConfigSheet(array $rows, array $dropdownMap, array $projectTypes): array
    {
        $configMap = [];

        foreach ($rows as $row) {
            $groupKey    = $row['group_key'] ?? null;
            $fieldName   = $row['field_name'] ?? null;
            $label       = $row['label'] ?? null;
            $placeholder = $row['placeholder'] ?? null;
            $type        = $row['type'] ?? null;
            $required    = $row['required'] ?? null;
            $default     = $row['default_value'] ?? null;
            $optionsKey  = $row['options_key'] ?? null;

            if (!$groupKey || !$fieldName) continue;

            $field = [
                'name'        => trim((string) $fieldName),
                'label'       => trim((string) $label),
                'placeholder' => trim((string) $placeholder),
                'type'        => trim((string) $type),
                'required'    => (bool) $required,
                'default'     => $default,
                'hidden'      => $this->isHidden($projectTypes, $row['project_types'] ?? null),
            ];

            if (in_array($type, ['select', 'single-select', 'multi-select', 'radio', 'checkbox']) && $optionsKey) {
                if (str_starts_with($optionsKey, 'db:')) {
                    $table_name = str_replace('db:', '', $optionsKey);

                    if ($table_name === 'categories' || $table_name === 'subcategories') {
                        $parent_id = $table_name === 'categories' ? 'industry_id' : 'category_id';

                        $field['options'] = DB::table($table_name)
                            ->select("id as value", "name as label", "{$parent_id} as parent")
                            ->get()
                            ->map(fn($item) => [
                                'value'  => $item->value,
                                'label'  => $item->label,
                                'parent' => $item->parent,
                            ])
                            ->toArray();
                    } else {
                        $field['options'] = DB::table($table_name)
                            ->select('id as value', 'name as label')
                            ->get()
                            ->map(fn($item) => [
                                'value' => $item->value,
                                'label' => $item->label,
                            ])
                            ->toArray();
                    }
                } else {
                    $optionsKey      = str_replace('excel:', '', $optionsKey);
                    $field['options'] = $dropdownMap[$optionsKey] ?? [];
                }
            }

            $configMap[$groupKey][] = $field;
        }

        return $configMap;
    }

    private function parseFieldSheet(array $rows, array $dropdownMap, array $configMap, array $projectTypes): array
    {
        $schema = [];

        foreach ($rows as $row) {
            $fieldName  = $row['field_name'] ?? null;
            $label      = $row['label'] ?? null;
            $type       = $row['type'] ?? null;
            $required   = $row['required'] ?? null;
            $default    = $row['default_value'] ?? null;
            $configKey  = $row['config_key'] ?? null;
            $optionsKey = $row['options_key'] ?? null;
            $layoutXS   = $row['layout_xs'] ?? null;
            $layoutSM   = $row['layout_sm'] ?? null;
            $layoutMD   = $row['layout_md'] ?? null;

            if (!$fieldName) continue;

            $field = [
                'name'     => trim((string) $fieldName),
                'label'    => trim((string) $label),
                'type'     => trim((string) $type),
                'required' => (bool) $required,
                'default'  => $default,
                'hidden'   => $this->isHidden($projectTypes, $row['project_types'] ?? null),
                'layout'   => ['xs' => $layoutXS, 'sm' => $layoutSM, 'md' => $layoutMD],
            ];

            if (in_array($type, ['select', 'single-select', 'multi-select', 'radio', 'checkbox']) && $optionsKey) {
                if (str_starts_with($optionsKey, 'db:')) {
                    $table_name = str_replace('db:', '', $optionsKey);

                    $field['options'] = DB::table($table_name)
                        ->select('id as value', 'name as label')
                        ->get()
                        ->map(fn($item) => [
                            'value' => $item->value,
                            'label' => $item->label,
                        ])
                        ->toArray();
                } else {
                    $optionsKey       = str_replace('excel:', '', $optionsKey);
                    $field['options'] = $dropdownMap[$optionsKey] ?? [];
                }
            }

            if (in_array($type, ['repeater', 'section']) && $configKey) {
                $field['fields'] = $configMap[$configKey] ?? [];
            }

            $schema[] = $field;
        }

        return $schema;
    }
}
