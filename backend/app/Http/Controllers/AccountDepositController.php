<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Http\Requests\AuditLogIndexRequest;
use App\Http\Requests\StoreAccountDepositRequest;
use App\Http\Resources\AccountDepositResource;
use App\Models\AccountDeposit;
use App\Models\ProjectGotItVoucherTransaction;

class AccountDepositController extends Controller
{
    public function store(StoreAccountDepositRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $deposit = AccountDeposit::create([
            'account_type' => $validated['account_type'],
            'amount' => $validated['amount'],
            'note' => $validated['note'] ?? null,
            'created_user_id' => Auth::id(),
        ]);

        Log::info('GotIt deposit added', [
            'deposit_id' => $deposit->id,
            'account_type' => $deposit->account_type,
            'amount' => $deposit->amount,
            'user_id' => Auth::id(),
        ]);

        return response()->json($this->accountSummary($validated['account_type']));
    }

    public function getGotItAccount($accountType): JsonResponse
    {
        return response()->json($this->accountSummary($accountType));
    }

    public function deposits(AuditLogIndexRequest $request, $accountType): JsonResponse
    {
        $deposits = AccountDeposit::with('createdBy')
            ->where('account_type', $accountType)
            ->latest('id')
            ->paginate($request->validated()['per_page'] ?? 10);

        return response()->json([
            'status_code' => 200,
            'message' => 'Successfully',
            'data' => AccountDepositResource::collection($deposits),
            'meta' => [
                'current_page' => $deposits->currentPage(),
                'per_page' => $deposits->perPage(),
                'total' => $deposits->total(),
                'last_page' => $deposits->lastPage(),
            ]
        ]);
    }

    private function accountSummary(string $accountType): array
    {
        $totalDeposit = AccountDeposit::where('account_type', $accountType)->sum('amount');

        $spent = ProjectGotItVoucherTransaction::where('voucher_status', ProjectGotItVoucherTransaction::STATUS_VOUCHER_SUCCESS)
                            ->sum('amount');

        return [
            'deposited' => $totalDeposit,
            'spent' => $spent,
            'balance' => $totalDeposit - $spent
        ];
    }
}
