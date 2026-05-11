<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Str;

class TemplateParserService
{
    public function parse(string $filePath, string $projectType): array
    {
        $sheet = Excel::toArray([], $filePath);

        $fieldsSheet = $this->getBySheetName($filePath, 'FIELDS');
        $configSheet = $this->getBySheetName($filePath, 'CONFIG');
        $selectSheet = $this->getBySheetName($filePath, 'SELECT');

        $dropdownMap = $this->parseSelectSheet($selectSheet);
        $configMap = $this->parseConfigSheet($configSheet, $dropdownMap, $projectType);
        
        return $this->parseFieldSheet($fieldsSheet, $dropdownMap, $configMap);
    }
    
    private function getBySheetName(string $filePath, string $sheetName): array
    {
        $spreadsheet = IOFactory::load($filePath);
        $sheetNames = $spreadsheet->getSheetNames();

        $excel = Excel::toArray([], $filePath);

        foreach($sheetNames as $index => $name){
            if($name === $sheetName){
                return $excel[$index];
            }
        }

        throw new \Exception("Missing sheet: {$sheetName}");
    }

    private function parseSelectSheet(array $rows): array
    {
        $map = [];

        foreach($rows as $index => $row){
            if($index === 0) continue;
            
            $key = $row[0] ?? null;
            $value = $row[1] ?? null;
            $label = $row[2] ?? null;

            if(!$key || !$value || !$label) continue;

            $map[$key][] = [
                'value' => trim($value),
                'label' => trim($label)
            ];
        }

        return $map;
    }

    private function parseConfigSheet(array $rows, array $dropdownMap, string $projectType): array
    {
        $configMap = [];

        foreach($rows as $index => $row){
            if($index === 0) continue;

            $groupKey           = $row[0] ?? null;
            $fieldName          = $row[1] ?? null;
            $label              = $row[2] ?? null;
            $type               = $row[3] ?? null;
            $required           = $row[4] ?? null;
            $default            = $row[5] ?? null;
            $optionsKey         = $row[6] ?? null;
            $projectTypeOptions = explode(",", $row[7]) ?? null;

            if(!$groupKey || !$fieldName) continue;

            $field = [
                'name'     => trim($fieldName),
                'label'    => trim($label),
                'type'     => trim($type),
                'required' => (bool)$required,
                'default'  => $default,
                'hidden' => !in_array($projectType, $projectTypeOptions)
            ];

            if($type === 'select' && $optionsKey || $type === 'multi-select' || $type === 'radio'){
                if(str_starts_with($optionsKey, 'db:')){
                    $table_name = str_replace('db:', '', $optionsKey);

                    $field['options'] = DB::table($table_name)
                                            ->select('id as value', 'name as label')
                                            ->get()
                                            ->map(fn($item) => [
                                                'value' => $item->value,
                                                'label' => $item->label
                                            ]);
                } else {
                    $optionsKey = str_replace('excel:', '', $optionsKey);

                    $field['options'] = $dropdownMap[$optionsKey] ?? [];
                }
            }

            $configMap[$groupKey][] = $field;
        }

        return $configMap;
    }

    private function parseFieldSheet(array $rows, array $dropdownMap, array $configMap): array
    {
        $schema = [];
        $currentGroupIndex = null;

        foreach($rows as $index => $row){
            if($index === 0) continue;

            $fieldName   = $row[0] ?? null;
            $label       = $row[1] ?? null;
            $type        = $row[2] ?? null;
            $required    = $row[3] ?? null;
            $default     = $row[4] ?? null;
            $configKey   = $row[5] ?? null;
            $optionsKey  = $row[6] ?? null;
            $layoutXS    = $row[7] ?? null;
            $layoutSM    = $row[8] ?? null;
            $layoutMD    = $row[9] ?? null;

            if(!$fieldName) continue;

            $field = [
                'name'     => trim($fieldName),
                'label'    => trim($label),
                'type'     => trim($type),
                'required' => (bool)$required,
                'default'  => $default,
                'layout'   => [
                    'xs' => $layoutXS,
                    'sm' => $layoutSM,
                    'md' => $layoutMD
                ]
            ];

            if($type === 'select' || $type === 'multi-select' || $type === 'radio' || $type === 'checkbox'){
                if(str_starts_with($optionsKey, 'db:')){
                    $table_name = str_replace('db:', '', $optionsKey);

                    $field['options'] = DB::table($table_name)
                                            ->select('id as value', 'name as label')
                                            ->get()
                                            ->map(fn($item) => [
                                                'value' => $item->value,
                                                'label' => $item->label
                                            ]);
                } else {
                    $optionsKey = str_replace('excel:', '', $optionsKey);

                    $field['options'] = $dropdownMap[$optionsKey] ?? [];     
                }
            }

            if($type === 'range' && $optionsKey){
                $field['fields'] = $groupMap[$optionsKey] ?? [];
            }

            if($type === 'repeater' && $configKey){
                $field['fields'] = $configMap[$configKey] ?? [];
            }

            if($type === 'section' && $configKey){
                $field['fields'] = $configMap[$configKey] ?? [];
            }

            $schema[] = $field;
        }

        return $schema;
    }
}