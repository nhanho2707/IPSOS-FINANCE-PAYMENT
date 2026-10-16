<?php

namespace Tests\Unit;

use App\Services\VinnetService;
use PHPUnit\Framework\TestCase;

class VinnetServiceTest extends TestCase
{
    private const MOBIFONE_CARDS = [10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000];
    private const VIETNAMOBILE_CARDS = [20000, 50000, 100000, 200000, 300000, 500000];

    public function test_split_amount_keeps_a_single_card_when_the_denomination_exists(): void
    {
        $this->assertSame([100000], (new VinnetService())->split_amount(100000, self::MOBIFONE_CARDS));
    }

    public function test_split_amount_uses_the_fewest_cards(): void
    {
        $service = new VinnetService();

        $this->assertSame([300000, 50000], $service->split_amount(350000, self::MOBIFONE_CARDS));
        $this->assertSame([300000, 100000, 50000], $service->split_amount(450000, self::MOBIFONE_CARDS));
        $this->assertSame([500000, 500000, 200000], $service->split_amount(1200000, self::MOBIFONE_CARDS));
    }

    public function test_split_amount_finds_a_combination_greedy_choice_would_miss(): void
    {
        // Greedy would take 50K and then be stuck on 10K, which Vietnamobile does not sell.
        $this->assertSame([20000, 20000, 20000], (new VinnetService())->split_amount(60000, self::VIETNAMOBILE_CARDS));
    }

    public function test_split_amount_returns_null_when_the_amount_cannot_be_made(): void
    {
        $service = new VinnetService();

        $this->assertNull($service->split_amount(10000, self::VIETNAMOBILE_CARDS));
        $this->assertNull($service->split_amount(15000, self::MOBIFONE_CARDS));
        $this->assertNull($service->split_amount(0, self::MOBIFONE_CARDS));
        $this->assertNull($service->split_amount(350000, []));
    }

    public function test_split_amount_ignores_duplicate_and_unordered_denominations(): void
    {
        $this->assertSame(
            [300000, 50000],
            (new VinnetService())->split_amount(350000, ['50000', 300000, 50000, 0, 10000])
        );
    }

    public function test_mask_pay_item_hides_every_pin_code(): void
    {
        $masked = (new VinnetService())->mask_pay_item([
            'totalAmt' => 100000,
            'cardItems' => [
                ['pinCode' => '790505672889', 'serialNo' => '102836000017089'],
                ['pinCode' => '123456789012', 'serialNo' => '102836000017090'],
            ],
        ]);

        $this->assertSame('***', $masked['cardItems'][0]['pinCode']);
        $this->assertSame('***', $masked['cardItems'][1]['pinCode']);
        $this->assertSame('102836000017089', $masked['cardItems'][0]['serialNo']);
        $this->assertSame(100000, $masked['totalAmt']);
    }
}
