<?php

namespace Tests\Feature;

use App\Constants\TransactionStatus;
use App\Http\Controllers\VinnetController;
use App\Models\ProjectRespondent;
use App\Models\ProjectVinnetTransaction;
use App\Services\VinnetService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class VinnetSplitCardsTest extends TestCase
{
    private const MOBIFONE_CARDS = [10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000];

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
        ]);
        DB::purge('sqlite');

        // The real migrations reuse index names, which SQLite rejects, so build only what the flow touches.
        Schema::create('project_respondents', function (Blueprint $table) {
            $table->id();
            $table->string('status')->nullable();
            $table->timestamps();
        });

        Schema::create('project_vinnet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_respondent_id');
            $table->string('vinnet_serviceitems_requuid')->nullable();
            $table->string('vinnet_payservice_requuid')->nullable();
            $table->string('vinnet_token_requuid');
            $table->string('vinnet_token');
            $table->integer('vinnet_token_order');
            $table->string('vinnet_token_status')->nullable();
            $table->string('vinnet_token_message')->nullable();
            $table->double('total_amt')->default(0.0);
            $table->double('commission')->default(0.0);
            $table->double('discount')->default(0.0);
            $table->double('payment_amt')->default(0.0);
            $table->string('card_serial_no', 50)->nullable();
            $table->string('card_pin_code', 50)->nullable();
            $table->string('card_expiry_date', 50)->nullable();
            $table->string('recipient_type')->default('NT');
            $table->datetime('vinnet_invoice_date')->nullable();
            $table->timestamps();

            $table->unique(['project_respondent_id', 'vinnet_token_order']);
        });
    }

    public function test_a_price_without_a_matching_card_is_paid_with_several_cards(): void
    {
        $respondent = $this->createRespondent();
        $vinnet = new FakeVinnetService(self::MOBIFONE_CARDS);

        $response = $this->dispatch($vinnet, $respondent, 350000);

        $this->assertSame(900, $response->getData(true)['status_code']);
        $this->assertSame([300000, 50000], $vinnet->paidValues);
        $this->assertSame(
            [[1, 300000.0], [2, 50000.0]],
            $this->verifiedCards($respondent)
        );
        $this->assertSame(ProjectRespondent::STATUS_RESPONDENT_GIFT_RECEIVED, $respondent->fresh()->status);
    }

    public function test_a_price_with_a_matching_card_still_buys_one_card(): void
    {
        $respondent = $this->createRespondent();
        $vinnet = new FakeVinnetService(self::MOBIFONE_CARDS);

        $this->dispatch($vinnet, $respondent, 100000);

        $this->assertSame([100000], $vinnet->paidValues);
        $this->assertSame([[1, 100000.0]], $this->verifiedCards($respondent));
    }

    public function test_a_retry_after_a_failed_card_only_buys_what_is_still_owed(): void
    {
        $respondent = $this->createRespondent();

        $firstAttempt = new FakeVinnetService(self::MOBIFONE_CARDS, failPayValues: [50000]);
        $response = $this->dispatch($firstAttempt, $respondent, 350000);

        $this->assertSame(998, $response->getData(true)['status_code']);
        $this->assertSame([[1, 300000.0]], $this->verifiedCards($respondent));

        // Vinnet reports the failed card as refunded, so its row is reused for the new purchase.
        $retry = new FakeVinnetService(self::MOBIFONE_CARDS, checkResults: ['*' => ['code' => 0, 'status' => 3]]);
        $response = $this->dispatch($retry, $respondent, 350000);

        $this->assertSame(900, $response->getData(true)['status_code']);
        $this->assertSame([50000], $retry->paidValues);
        $this->assertSame([[1, 300000.0], [2, 50000.0]], $this->verifiedCards($respondent));
        $this->assertSame(2, ProjectVinnetTransaction::count());
    }

    public function test_a_card_whose_purchase_went_through_is_not_bought_again(): void
    {
        $respondent = $this->createRespondent();
        $this->createTransaction($respondent, 1, TransactionStatus::STATUS_VERIFIED, 300000);
        $this->createTransaction($respondent, 2, TransactionStatus::STATUS_ERROR, 0, 'uuid-timed-out');

        $vinnet = new FakeVinnetService(self::MOBIFONE_CARDS, checkResults: [
            'uuid-timed-out' => ['code' => 0, 'status' => 1, 'value' => 50000],
        ]);

        $response = $this->dispatch($vinnet, $respondent, 350000);

        $this->assertSame(900, $response->getData(true)['status_code']);
        $this->assertSame([], $vinnet->paidValues);
        $this->assertSame([[1, 300000.0], [2, 50000.0]], $this->verifiedCards($respondent));
    }

    public function test_a_card_still_processing_at_vinnet_blocks_new_purchases(): void
    {
        $respondent = $this->createRespondent();
        $this->createTransaction($respondent, 1, TransactionStatus::STATUS_ERROR, 0, 'uuid-processing');

        $vinnet = new FakeVinnetService(self::MOBIFONE_CARDS, checkResults: [
            'uuid-processing' => ['code' => 0, 'status' => 2],
        ]);

        $response = $this->dispatch($vinnet, $respondent, 350000);

        $this->assertSame(998, $response->getData(true)['status_code']);
        $this->assertSame([], $vinnet->paidValues);
        $this->assertSame(ProjectRespondent::STATUS_RESPONDENT_GIFT_TEMPORARY_ERROR, $respondent->fresh()->status);
    }

    public function test_an_amount_the_cards_cannot_make_up_is_rejected_before_paying(): void
    {
        $respondent = $this->createRespondent();
        $vinnet = new FakeVinnetService(self::MOBIFONE_CARDS);

        $response = $this->dispatch($vinnet, $respondent, 15000);

        $this->assertSame(903, $response->getData(true)['status_code']);
        $this->assertSame([], $vinnet->paidValues);
        $this->assertSame(0, ProjectVinnetTransaction::count());
    }

    public function test_a_respondent_who_already_has_every_card_is_not_charged_again(): void
    {
        $respondent = $this->createRespondent();
        $this->createTransaction($respondent, 1, TransactionStatus::STATUS_VERIFIED, 300000);
        $this->createTransaction($respondent, 2, TransactionStatus::STATUS_VERIFIED, 50000);

        $vinnet = new FakeVinnetService(self::MOBIFONE_CARDS);

        $response = $this->dispatch($vinnet, $respondent, 350000);

        $this->assertSame(900, $response->getData(true)['status_code']);
        $this->assertSame([], $vinnet->paidValues);
    }

    public function test_a_card_whose_result_vinnet_cannot_tell_yet_is_not_bought_again(): void
    {
        $respondent = $this->createRespondent();
        $this->createTransaction($respondent, 1, TransactionStatus::STATUS_ERROR, 0, 'uuid-unknown');

        $vinnet = new FakeVinnetService(self::MOBIFONE_CARDS, checkResults: [
            'uuid-unknown' => ['code' => VinnetService::CODE_RESULT_UNKNOWN],
        ]);

        $response = $this->dispatch($vinnet, $respondent, 350000);

        $this->assertSame(998, $response->getData(true)['status_code']);
        $this->assertSame([], $vinnet->paidValues);
        $this->assertSame(1, ProjectVinnetTransaction::count());
    }

    public function test_a_card_vinnet_has_no_record_of_is_bought_again_in_the_same_row(): void
    {
        $respondent = $this->createRespondent();
        $this->createTransaction($respondent, 1, TransactionStatus::STATUS_ERROR, 0, 'uuid-never-sent');

        $vinnet = new FakeVinnetService(self::MOBIFONE_CARDS, checkResults: [
            'uuid-never-sent' => ['code' => VinnetService::CODE_TRANSACTION_NOT_FOUND],
        ]);

        $response = $this->dispatch($vinnet, $respondent, 100000);

        $this->assertSame(900, $response->getData(true)['status_code']);
        $this->assertSame([100000], $vinnet->paidValues);
        $this->assertSame([[1, 100000.0]], $this->verifiedCards($respondent));
        $this->assertSame(1, ProjectVinnetTransaction::count());
    }

    public function test_an_empty_vinnet_balance_is_reported_separately(): void
    {
        $respondent = $this->createRespondent();
        $vinnet = new FakeVinnetService(self::MOBIFONE_CARDS, failPayValues: [100000], failPayCode: VinnetService::CODE_INSUFFICIENT_BALANCE);

        $response = $this->dispatch($vinnet, $respondent, 100000);

        $this->assertSame(998, $response->getData(true)['status_code']);
        $this->assertSame(ProjectRespondent::ERROR_RESPONDENT_GIFT_INSUFFICIENT_BALANCE, $response->getData(true)['message']);
        $this->assertSame(ProjectRespondent::STATUS_RESPONDENT_GIFT_TEMPORARY_ERROR, $respondent->fresh()->status);
    }

    public function test_card_purchases_are_sent_with_the_non_topup_recipient_type(): void
    {
        $respondent = $this->createRespondent();
        $vinnet = new FakeVinnetService(self::MOBIFONE_CARDS);

        $this->dispatch($vinnet, $respondent, 350000);

        $this->assertSame(['NT', 'NT'], $vinnet->recipientTypes);
    }

    private function dispatch(FakeVinnetService $vinnet, ProjectRespondent $respondent, int $price)
    {
        $method = new \ReflectionMethod(VinnetController::class, 'dispatch_vinnet_cards');

        return $method->invoke(new VinnetController(), $vinnet, $respondent, new FakeTokenRecord(), $price, 'S0012', '0903858398', 'qr');
    }

    private function createRespondent(): ProjectRespondent
    {
        $respondent = new ProjectRespondent();
        $respondent->status = ProjectRespondent::STATUS_RESPONDENT_PENDING;
        $respondent->save();

        return $respondent;
    }

    private function createTransaction(ProjectRespondent $respondent, int $order, string $status, int $value, ?string $uuid = null): void
    {
        $respondent->createVinnetTransactions([
            'vinnet_payservice_requuid' => $uuid ?? 'uuid-' . $order,
            'vinnet_token_requuid' => 'token-uuid',
            'vinnet_token' => 'token',
            'vinnet_token_order' => $order,
            'vinnet_token_status' => $status,
            'total_amt' => $value,
        ]);
    }

    private function verifiedCards(ProjectRespondent $respondent): array
    {
        return $respondent->vinnetTransactions()
            ->where('vinnet_token_status', TransactionStatus::STATUS_VERIFIED)
            ->orderBy('vinnet_token_order')
            ->get()
            ->map(fn ($transaction) => [$transaction->vinnet_token_order, (float) $transaction->total_amt])
            ->all();
    }
}

class FakeTokenRecord
{
    public array $updates = [];

    public function update(array $attributes): bool
    {
        $this->updates[] = $attributes;

        return true;
    }
}

class FakeVinnetService extends VinnetService
{
    public array $paidValues = [];
    public array $recipientTypes = [];

    public function __construct(
        private array $cardValues,
        private array $failPayValues = [],
        private array $checkResults = [],
        private int $failPayCode = 23,
    ) {
    }

    public function authenticate_token()
    {
        return ['reqUuid' => 'token-uuid', 'token' => 'token', 'code' => 0, 'message' => 'OK'];
    }

    public function query_service($phone_number, $service_code, $token, $price)
    {
        return [
            'reqUuid' => 'query-uuid',
            'service_items' => array_map(fn ($value) => ['itemValue' => $value, 'itemName' => $value . 'đ'], $this->cardValues),
            'code' => 0,
            'message' => 'OK',
        ];
    }

    public function check_transaction($token, $refReqUuid)
    {
        $result = $this->checkResults[$refReqUuid] ?? $this->checkResults['*'] ?? ['code' => VinnetService::CODE_TRANSACTION_NOT_FOUND];

        if ($result['code'] !== 0) {
            return ['reqUuid' => $refReqUuid, 'code' => $result['code'], 'message' => 'Not found'];
        }

        return [
            'reqUuid' => $refReqUuid,
            'pay_item' => $this->payItem($result['value'] ?? 0) + ['status' => $result['status']],
            'code' => 0,
            'message' => 'OK',
        ];
    }

    public function pay_service($uuid, $phone_number, $service_code, $token, $service_item, $recipient_type = self::RECIPIENT_TYPE_OTHER)
    {
        $this->recipientTypes[] = $recipient_type;

        if (in_array($service_item['itemValue'], $this->failPayValues, true)) {
            return ['reqUuid' => $uuid, 'code' => $this->failPayCode, 'message' => 'Vinnet error ' . $this->failPayCode];
        }

        $this->paidValues[] = $service_item['itemValue'];

        return ['reqUuid' => $uuid, 'pay_item' => $this->payItem($service_item['itemValue']), 'code' => 0, 'message' => 'OK'];
    }

    private function payItem(int $value): array
    {
        return [
            'totalAmt' => $value,
            'commission' => 0,
            'discount' => 0,
            'paymentAmt' => $value,
            'recipientType' => 'TT',
            'cardItems' => [['pinCode' => 'PIN' . $value, 'serialNo' => 'SERI' . $value, 'expiryDate' => '31-12-2028']],
        ];
    }
}
