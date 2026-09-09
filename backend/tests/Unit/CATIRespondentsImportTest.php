<?php

namespace Tests\Unit;

use App\Imports\CATIRespondentsImport;
use Illuminate\Translation\ArrayLoader;
use Illuminate\Translation\Translator;
use Illuminate\Validation\Factory;
use PHPUnit\Framework\TestCase;

class CATIRespondentsImportTest extends TestCase
{
    public function test_prepare_for_validation_restores_excel_normalized_phone_and_id(): void
    {
        $import = new CATIRespondentsImport(1, 1);

        $row = $import->prepareForValidation([
            'ID' => '123.0',
            'Phone' => '313798999.0',
            'Name' => 'HOANG TRUNG',
            'Link' => 'https://example.com/respondent',
            'Filter_1' => 'Ha Noi',
        ]);

        $this->assertSame('123', $row['id']);
        $this->assertSame('0313798999', $row['phone']);
    }

    public function test_normalized_excel_phone_passes_import_validation_rules(): void
    {
        $import = new CATIRespondentsImport(1, 1);

        $row = $import->prepareForValidation([
            'ID' => '123.00',
            'Phone' => '313798999.0',
            'Name' => 'HOANG TRUNG',
            'Link' => 'https://example.com/respondent',
        ]);

        $validator = new Factory(
            new Translator(new ArrayLoader(), 'en')
        );

        $validation = $validator->make([$row], $import->rules(), $import->customValidationMessages());

        $this->assertTrue($validation->passes());
    }
}
