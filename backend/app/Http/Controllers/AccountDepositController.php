<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Http\Requests\AuditLogIndexRequest;
use App\Http\Requests\StoreAccountDepositRequest;
use App\Http\Requests\VoidAccountDepositRequest;
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

        // The deposit comes back so the page can offer to undo it straight away.
        return response()->json($this->accountSummary($validated['account_type']) + [
            'deposit' => new AccountDepositResource($deposit->load('createdBy')),
        ]);
    }

    public function void(VoidAccountDepositRequest $request, $depositId): JsonResponse
    {
        $reason = $request->validated()['reason'];

        // The row lock makes a second click (or a second person) wait and then see the deposit already voided.
        [$deposit, $alreadyVoided] = DB::transaction(function () use ($depositId, $reason) {
            $deposit = AccountDeposit::whereKey($depositId)->lockForUpdate()->first();

            if (!$deposit || $deposit->voided_at !== null) {
                return [$deposit, true];
            }

            $deposit->update([
                'voided_at' => now(),
                'voided_by' => Auth::id(),
                'void_reason' => $reason,
            ]);

            return [$deposit, false];
        });

        if (!$deposit) {
            return response()->json([
                'status_code' => 404,
                'message' => 'Deposit not found.'
            ], 404);
        }

        if ($alreadyVoided) {
            return response()->json([
                'status_code' => 409,
                'message' => 'This deposit was already voided.'
            ], 409);
        }

        Log::info('GotIt deposit voided', [
            'deposit_id' => $deposit->id,
            'amount' => $deposit->amount,
            'user_id' => Auth::id(),
            'reason' => $reason,
        ]);

        return response()->json($this->accountSummary($deposit->account_type) + [
            'deposit' => new AccountDepositResource($deposit->load(['createdBy', 'voidedBy'])),
        ]);
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
        $totalDeposit = AccountDeposit::notVoided()->where('account_type', $accountType)->sum('amount');

        $spent = ProjectGotItVoucherTransaction::where('voucher_status', ProjectGotItVoucherTransaction::STATUS_VOUCHER_SUCCESS)
                            ->sum('amount');

        return [
            'deposited' => $totalDeposit,
            'spent' => $spent,
            'balance' => $totalDeposit - $spent
        ];
    }
}
