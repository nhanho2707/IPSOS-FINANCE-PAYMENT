<?php

namespace Tests\Feature;

use App\Http\Controllers\ProjectController;
use App\Http\Requests\DeleteProjectPriceRequest;
use App\Http\Requests\ImportProjectPricesRequest;
use App\Http\Requests\UpsertProjectPriceRequest;
use App\Models\ProjectProvince;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ProjectPricesTest extends TestCase
{
    private const PROJECT_ID = 1;
    private const HO_CHI_MINH = 79;
    private const HA_NOI = 1;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
        ]);
        DB::purge('sqlite');

        // The real migrations reuse index names, which SQLite rejects, so build only what the endpoints touch.
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
        });

        Schema::create('provinces', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('project_provinces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id');
            $table->foreignId('province_id');
            $table->integer('sample_size_main');
            $table->decimal('price_main', 15, 2);
            foreach (['main_1', 'main_2', 'main_3', 'main_4', 'main_5'] as $suffix) {
                $table->decimal('price_' . $suffix, 15, 2)->nullable();
            }
            $table->integer('sample_size_boosters')->nullable();
            foreach (['boosters', 'boosters_1', 'boosters_2', 'boosters_3', 'boosters_4', 'boosters_5'] as $suffix) {
                $table->decimal('price_' . $suffix, 15, 2)->nullable();
            }
            $table->integer('sample_size_non')->nullable();
            foreach (['non', 'non_1', 'non_2', 'non_3', 'non_4', 'non_5'] as $suffix) {
                $table->decimal('price_' . $suffix, 15, 2)->nullable();
            }
            $table->timestamps();
        });

        DB::table('projects')->insert(['id' => self::PROJECT_ID]);
        DB::table('provinces')->insert([
            ['id' => self::HA_NOI, 'name' => 'Hà Nội'],
            ['id' => self::HO_CHI_MINH, 'name' => 'Hồ Chí Minh'],
        ]);
    }

    public function test_add_creates_the_province_row_and_returns_it_in_the_list_shape(): void
    {
        $response = $this->upsert([
            'province_id' => self::HO_CHI_MINH,
            'price_type' => 'main',
            'sample_size' => 10,
            'price' => 50000,
            'price_1' => 100000,
        ]);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertEquals([
            'province_id' => self::HO_CHI_MINH,
            'province_name' => 'Hồ Chí Minh',
            'price_type' => 'main',
            'sample_size' => 10,
            'price' => 50000.0,
            'price_1' => 100000.0,
            'price_2' => 0.0,
            'price_3' => 0.0,
            'price_4' => 0.0,
            'price_5' => 0.0,
        ], $response->getData(true)['data']);

        $this->assertSame([$response->getData(true)['data']], $this->listPrices());
    }

    public function test_adding_a_booster_price_alone_fills_the_required_main_columns_with_zero(): void
    {
        $response = $this->upsert([
            'province_id' => self::HA_NOI,
            'price_type' => 'booster',
            'sample_size' => 5,
            'price' => 70000,
        ]);

        $this->assertSame(200, $response->getStatusCode());

        $row = ProjectProvince::first();
        $this->assertSame(0, (int) $row->sample_size_main);
        $this->assertSame(0.0, (float) $row->price_main);
        $this->assertSame(5, (int) $row->sample_size_boosters);
        $this->assertSame(70000.0, (float) $row->price_boosters);

        $this->assertSame(['booster'], array_column($this->listPrices(), 'price_type'));
    }

    public function test_adding_the_same_province_and_type_again_updates_it(): void
    {
        $this->upsert(['province_id' => self::HO_CHI_MINH, 'price_type' => 'main', 'sample_size' => 10, 'price' => 50000]);
        $this->upsert(['province_id' => self::HO_CHI_MINH, 'price_type' => 'main', 'sample_size' => 20, 'price' => 60000]);

        $this->assertSame(1, ProjectProvince::count());
        $this->assertEquals([[20, 60000]], array_map(
            fn ($row) => [$row['sample_size'], $row['price']],
            $this->listPrices()
        ));
    }

    public function test_adding_another_type_keeps_the_existing_one(): void
    {
        $this->upsert(['province_id' => self::HO_CHI_MINH, 'price_type' => 'main', 'sample_size' => 10, 'price' => 50000]);
        $this->upsert(['province_id' => self::HO_CHI_MINH, 'price_type' => 'non', 'sample_size' => 3, 'price' => 30000]);

        $this->assertSame(1, ProjectProvince::count());
        $this->assertSame(['main', 'non'], array_column($this->listPrices(), 'price_type'));
    }

    public function test_delete_removes_only_that_type_from_the_list(): void
    {
        $this->upsert(['province_id' => self::HO_CHI_MINH, 'price_type' => 'main', 'sample_size' => 10, 'price' => 50000]);
        $this->upsert(['province_id' => self::HO_CHI_MINH, 'price_type' => 'booster', 'sample_size' => 4, 'price' => 80000, 'price_1' => 90000]);

        $response = $this->deletePrice(['province_id' => self::HO_CHI_MINH, 'price_type' => 'booster']);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(['main'], array_column($this->listPrices(), 'price_type'));

        $row = ProjectProvince::first();
        $this->assertSame(0, (int) $row->sample_size_boosters);
        $this->assertNull($row->price_boosters_1);
    }

    public function test_deleting_main_resets_the_not_null_columns_to_zero(): void
    {
        $this->upsert(['province_id' => self::HO_CHI_MINH, 'price_type' => 'main', 'sample_size' => 10, 'price' => 50000]);

        $response = $this->deletePrice(['province_id' => self::HO_CHI_MINH, 'price_type' => 'main']);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame([], $this->listPrices());

        $row = ProjectProvince::first();
        $this->assertSame(0, (int) $row->sample_size_main);
        $this->assertSame(0.0, (float) $row->price_main);
    }

    public function test_deleting_a_province_without_prices_returns_not_found(): void
    {
        $response = $this->deletePrice(['province_id' => self::HA_NOI, 'price_type' => 'main']);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function test_adding_to_a_missing_project_returns_not_found(): void
    {
        $response = $this->upsert(['province_id' => self::HO_CHI_MINH, 'price_type' => 'main', 'sample_size' => 10, 'price' => 50000], 999);

        $this->assertSame(404, $response->getStatusCode());
        $this->assertSame(0, ProjectProvince::count());
    }

    public function test_add_rejects_invalid_input(): void
    {
        $valid = ['province_id' => self::HO_CHI_MINH, 'price_type' => 'main', 'sample_size' => 10, 'price' => 50000];

        foreach ([
            'unknown province' => ['province_id' => 12345],
            'unknown price type' => ['price_type' => 'main_1'],
            'zero sample size' => ['sample_size' => 0],
            'zero first price' => ['price' => 0],
            'negative extra price' => ['price_2' => -1],
        ] as $case => $override) {
            try {
                $this->validated(UpsertProjectPriceRequest::class, array_merge($valid, $override));
                $this->fail("Expected a validation error for: {$case}");
            } catch (ValidationException $e) {
                $this->addToAssertionCount(1);
            }
        }

        $this->assertSame(0, ProjectProvince::count());
    }

    public function test_import_upserts_every_row_and_keeps_prices_not_in_the_file(): void
    {
        $this->upsert(['province_id' => self::HA_NOI, 'price_type' => 'non', 'sample_size' => 3, 'price' => 30000]);
        $this->upsert(['province_id' => self::HO_CHI_MINH, 'price_type' => 'main', 'sample_size' => 10, 'price' => 50000]);

        $response = $this->import([
            ['province_id' => self::HO_CHI_MINH, 'price_type' => 'main', 'sample_size' => 20, 'price' => 60000, 'price_1' => 70000],
            ['province_id' => self::HO_CHI_MINH, 'price_type' => 'booster', 'sample_size' => 5, 'price' => 80000],
            ['province_id' => self::HA_NOI, 'price_type' => 'main', 'sample_size' => 8, 'price' => 40000],
        ]);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(2, ProjectProvince::count());
        $this->assertEquals([
            [self::HA_NOI, 'main', 8, 40000, 0],
            [self::HA_NOI, 'non', 3, 30000, 0],
            [self::HO_CHI_MINH, 'main', 20, 60000, 70000],
            [self::HO_CHI_MINH, 'booster', 5, 80000, 0],
        ], array_map(
            fn ($row) => [$row['province_id'], $row['price_type'], $row['sample_size'], $row['price'], $row['price_1']],
            $this->listPrices()
        ));
    }

    public function test_import_into_a_missing_project_returns_not_found(): void
    {
        $response = $this->import([
            ['province_id' => self::HO_CHI_MINH, 'price_type' => 'main', 'sample_size' => 10, 'price' => 50000],
        ], 999);

        $this->assertSame(404, $response->getStatusCode());
        $this->assertSame(0, ProjectProvince::count());
    }

    public function test_import_rejects_invalid_input(): void
    {
        $valid = ['province_id' => self::HO_CHI_MINH, 'price_type' => 'main', 'sample_size' => 10, 'price' => 50000];

        foreach ([
            'no rows' => [],
            'not a list' => 'abc',
            'unknown province' => [array_merge($valid, ['province_id' => 12345])],
            'zero first price' => [array_merge($valid, ['price' => 0])],
            'same province and type twice' => [$valid, array_merge($valid, ['sample_size' => 20])],
        ] as $case => $prices) {
            try {
                $this->validated(ImportProjectPricesRequest::class, ['prices' => $prices], 'POST');
                $this->fail("Expected a validation error for: {$case}");
            } catch (ValidationException $e) {
                $this->addToAssertionCount(1);
            }
        }

        $this->assertSame(0, ProjectProvince::count());
    }

    private function import(array $prices, int $projectId = self::PROJECT_ID)
    {
        return (new ProjectController())->importProjectPrices(
            $this->validated(ImportProjectPricesRequest::class, ['prices' => $prices], 'POST'),
            $projectId
        );
    }

    private function upsert(array $data, int $projectId = self::PROJECT_ID)
    {
        return (new ProjectController())->upsertProjectPrice($this->validated(UpsertProjectPriceRequest::class, $data), $projectId);
    }

    private function deletePrice(array $data)
    {
        return (new ProjectController())->deleteProjectPrice($this->validated(DeleteProjectPriceRequest::class, $data), self::PROJECT_ID);
    }

    private function listPrices(): array
    {
        return (new ProjectController())->getProjectPrices(self::PROJECT_ID)->getData(true)['data'];
    }

    /**
     * @param class-string<FormRequest> $requestClass
     */
    private function validated(string $requestClass, array $data, string $method = 'PUT'): FormRequest
    {
        $request = $requestClass::create('/', $method, $data);
        $request->setContainer($this->app)->setRedirector($this->app['redirect']);
        $request->validateResolved();

        return $request;
    }
}
