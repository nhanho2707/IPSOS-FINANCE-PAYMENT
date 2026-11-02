<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Ramsey\Uuid\Uuid;
use Carbon\Carbon;
use App\Models\ProjectRespondent;
use App\Models\ProjectRespondentToken;
use App\Models\ProjectGotItVoucherTransaction;
use App\Constants\TransactionStatus;

class ProjectRespondentTokenService
{
    private array $offlineBatchTokenHashes = [];

    private function generate_formated_uuid()
    {
        // Generate a UUID using Laravel's Str::uuid() method
        $uuid = Uuid::uuid4()->toString();
        return $uuid;
    }

    public function createOrReuseToken(ProjectRespondent $projectRespondent){

        $resultToken = $projectRespondent->token;

        if($resultToken){
            if($resultToken->status === 'blocked'){
                throw new \Exception(TransactionStatus::STATUS_EXPIRED);
            }

            // Nếu token đã hết hạn → block luôn
            if ($resultToken->expires_at->isPast()) {

                $resultToken->update([
                    'status' => 'blocked'
                ]);

                throw new \Exception(TransactionStatus::STATUS_EXPIRED);
            }

            $secret = Str::random(40);

            $resultToken->update([
                'token_hash' => Hash::make($secret),
            ]);

            return $resultToken->token_public . '.' . $secret;
        }

        $public = $this->generate_formated_uuid();

        $secret = Str::random(40);

        $projectRespondent->token()->create([
            'project_respondent_id' => $projectRespondent->id,
            'token_public' => $public,
            'token_hash' => Hash::make($secret),
            'attempts' => 0, 
            'expires_at' => now()->addHours(24),
            'status' => 'active'
        ]);

        return $public . '.' . $secret;
    }

    public function verifyToken(string $token)
    {
        if (! str_contains($token, '.')) {
            throw new \Exception(TransactionStatus::STATUS_INVALID);
        }
        
        [$public, $secret] = explode('.', $token);

        $record = ProjectRespondentToken::where('token_public', $public)->first();

        if(!$record || !Hash::check($secret, $record->token_hash)){
            $record->increment('attempts');
            throw new \Exception(TransactionStatus::STATUS_INVALID, 501);
        }

        if($record->status === 'blocked'){
            $projectRespondent = $record->projectRespondent;

            $hasSuccess = false;

            if($projectRespondent->channel === 'vinnet'){
                $hasSuccess = $projectRespondent->vinnetTransactions()
                                                            ->where('vinnet_token_status', TransactionStatus::STATUS_VERIFIED)
                                                            ->exists();
            } else if($projectRespondent->channel === 'gotit'){
                $hasSuccess = $projectRespondent->gotitVoucherTransactions()
                                                    ->where('voucher_status', ProjectGotItVoucherTransaction::STATUS_VOUCHER_SUCCESS)
                                                    ->exists();
            } else {
                throw new \Exception(TransactionStatus::STATUS_INVALID, 501);
            }

            if($hasSuccess){
                return $record;
            }
        }

        if($record->expires_at->isPast()){
            $record->update([
                'status' => 'blocked'
            ]);
            throw new \Exception(TransactionStatus::STATUS_EXPIRED, 502);
        }

        if($record->attempts >= 3){
            $record->update([
                'status' => 'blocked'
            ]);
            throw new \Exception(TransactionStatus::STATUS_SUSPENDED, 503);
        }

        return $record;
    }

    public function createOfflineToken(ProjectRespondent $projectRespondent, string $batchId)
    {
        $resultToken = $projectRespondent->token;

        if($resultToken){
            if($resultToken->status === 'blocked'){
                throw new \Exception(TransactionStatus::STATUS_EXPIRED);
            }

            return $resultToken->token_public . '.' . $resultToken->batch_id;
        }

        $public = $this->generate_formated_uuid();

        // Offline tokens are verified by public id + batch id, never by secret, so the hash is a placeholder.
        // Hashing once per batch matters: a bcrypt per row made large imports exceed the request time limit.
        $this->offlineBatchTokenHashes[$batchId] ??= Hash::make(Str::random(40));

        $projectRespondent->token()->create([
            'project_respondent_id' => $projectRespondent->id,
            'token_public' => $public,
            'token_hash' => $this->offlineBatchTokenHashes[$batchId],
            'attempts' => 0, 
            'expires_at' => now()->addHours(24),
            'status' => 'active',
            'batch_id' => $batchId
        ]);

        return $public . '.' . $batchId; 
    }

    public function verifyTokenOffline(string $token)
    {
        if(!str_contains($token, '.')){
            throw new \Exception(TransactionStatus::STATUS_INVALID, 501);
        }

        [$public, $batch_id] = explode('.', $token);

        Log::info('Token Offline: ', [$public, $batch_id]);

        $record = ProjectRespondentToken::where('token_public', $public)
                                            ->where('batch_id', $batch_id)
                                            ->where('status', 'active')
                                            ->first();
        
        Log::info('Error: ' . $record);

        if(!$record){
            throw new \Exception(TransactionStatus::STATUS_INVALID, 501);
        }

        if($record->status === 'blocked'){
            throw new \Exception(TransactionStatus::STATUS_EXPIRED, 502);
        }

        if($record->attempts >= 3){
            $record->update([
                'status' => 'blocked'
            ]);
            throw new \Exception(TransactionStatus::STATUS_SUSPENDED, 503);
        }

        return $record;
    }


}