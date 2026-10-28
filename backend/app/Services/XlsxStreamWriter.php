<?php

namespace App\Services;

use RuntimeException;
use ZipArchive;

/**
 * Writes an .xlsx row by row to disk instead of building the workbook in memory like
 * PhpSpreadsheet does, so exports of tens of thousands of rows no longer run out of memory.
 */
class XlsxStreamWriter
{
    // Excel keeps numbers as doubles: longer digit strings (IDs, references) would lose digits.
    private const MAX_NUMERIC_DIGITS = 15;

    private const MAX_CELL_LENGTH = 32767;

    private array $columnLetters = [];

    public function write(string $path, array $headings, iterable $rows): void
    {
        $sheetPath = $path . '.sheet.xml';
        $sheet = fopen($sheetPath, 'wb');

        if ($sheet === false) {
            throw new RuntimeException('Cannot create temporary sheet file: ' . $sheetPath);
        }

        try {
            fwrite($sheet, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                . '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
                . '<sheetData>');

            $rowNumber = 1;

            fwrite($sheet, $this->rowXml($rowNumber++, $headings, 1));

            foreach ($rows as $row) {
                fwrite($sheet, $this->rowXml($rowNumber++, $row, 0));
            }

            fwrite($sheet, '</sheetData></worksheet>');
        } finally {
            fclose($sheet);
        }

        try {
            $zip = new ZipArchive();

            if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new RuntimeException('Cannot create xlsx file: ' . $path);
            }

            $zip->addFromString('[Content_Types].xml', $this->contentTypesXml());
            $zip->addFromString('_rels/.rels', $this->rootRelsXml());
            $zip->addFromString('xl/workbook.xml', $this->workbookXml());
            $zip->addFromString('xl/_rels/workbook.xml.rels', $this->workbookRelsXml());
            $zip->addFromString('xl/styles.xml', $this->stylesXml());
            $zip->addFile($sheetPath, 'xl/worksheets/sheet1.xml');
            $zip->close();
        } finally {
            @unlink($sheetPath);
        }
    }

    private function rowXml(int $rowNumber, array $values, int $styleIndex): string
    {
        $xml = '<row r="' . $rowNumber . '">';

        foreach (array_values($values) as $columnIndex => $value) {
            $xml .= $this->cellXml($this->columnLetter($columnIndex) . $rowNumber, $value, $styleIndex);
        }

        return $xml . '</row>';
    }

    private function cellXml(string $reference, $value, int $styleIndex): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        $style = $styleIndex > 0 ? ' s="' . $styleIndex . '"' : '';

        if ($this->isNumeric($value)) {
            return '<c r="' . $reference . '"' . $style . '><v>' . $value . '</v></c>';
        }

        return '<c r="' . $reference . '"' . $style . ' t="inlineStr"><is><t xml:space="preserve">'
            . $this->escape((string) $value)
            . '</t></is></c>';
    }

    private function isNumeric($value): bool
    {
        if (is_int($value)) {
            return true;
        }

        if (is_float($value)) {
            return is_finite($value);
        }

        if (!is_string($value) || !preg_match('/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/', $value)) {
            return false;
        }

        return strlen(preg_replace('/\D/', '', $value)) <= self::MAX_NUMERIC_DIGITS;
    }

    private function escape(string $value): string
    {
        if (!mb_check_encoding($value, 'UTF-8')) {
            $value = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
        }

        // Control characters are not allowed in XML and make Excel reject the whole file.
        $value = preg_replace('/[^\x{9}\x{A}\x{D}\x{20}-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u', '', $value) ?? '';

        if (mb_strlen($value) > self::MAX_CELL_LENGTH) {
            $value = mb_substr($value, 0, self::MAX_CELL_LENGTH);
        }

        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    private function columnLetter(int $index): string
    {
        if (!isset($this->columnLetters[$index])) {
            $letters = '';
            $number = $index + 1;

            while ($number > 0) {
                $remainder = ($number - 1) % 26;
                $letters = chr(65 + $remainder) . $letters;
                $number = intdiv($number - 1, 26);
            }

            $this->columnLetters[$index] = $letters;
        }

        return $this->columnLetters[$index];
    }

    private function contentTypesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            . '</Types>';
    }

    private function rootRelsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>';
    }

    private function workbookXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets><sheet name="Worksheet" sheetId="1" r:id="rId1"/></sheets>'
            . '</workbook>';
    }

    private function workbookRelsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            . '</Relationships>';
    }

    private function stylesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
            . '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
            . '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
            . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            . '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
            . '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
            . '</styleSheet>';
    }
}
