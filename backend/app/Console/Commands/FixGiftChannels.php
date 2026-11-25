<?php

namespace App\Console\Commands;

use App\Constants\TransactionStatus;
use App\Models\ProjectGotItVoucherTransaction;
use App\Models\ProjectRespondent;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Before the guards in the gift endpoints, re-opening an interview after the gift went out could
 * overwrite the respondent: a request to the other provider changed the channel, and a refusal
 * marked a paid respondent as refused with channel 'other'. This finds those respondents from the
 * transactions that were actually delivered.
 */
class FixGiftChannels extends Command
{
    protected $signature = 'gifts:fix-channels
                            {--project= : Only check this project id}
                            {--apply : Write the corrected channels; without it the command only reports}';

    protected $description = 'Find respondents whose channel or refused status contradicts the gift they were delivered';

    public function handle(): int
    {
        $rows = $this->respondentsWithDeliveredGifts();

        $doublePaid = $rows->filter(fn ($row) => $row->by_vinnet && $row->by_gotit);
        $toFix = $rows->reject(fn ($row) => $row->by_vinnet && $row->by_gotit)
            ->filter(fn ($row) => $this->changes($row) !== []);

        $this->info("Respondents with a delivered gift: {$rows->count()}");

        $this->line('');
        $this->info("Channel or status contradicts the delivered gift: {$toFix->count()}");
        if ($toFix->isNotEmpty()) {
            $this->table(
                ['ID', 'Project', 'Respondent', 'Channel now', 'Delivered by', 'Status now', 'Refusal reason', 'Fix'],
                $toFix->map(fn ($row) => [
                    $row->id,
                    $row->internal_code,
                    $row->respondent_id,
                    $row->channel ?? '—',
                    $this->deliveredBy($row),
                    $row->status,
                    $row->reject_message ?? '',
                    collect($this->changes($row))->map(fn ($value, $column) => $column . ' → ' . ($value ?? 'empty'))->implode(', '),
                ])->all()
            );
        }

        $this->line('');
        $this->warn("Gift delivered by both Vinnet and GotIt (paid twice, left as is): {$doublePaid->count()}");
        if ($doublePaid->isNotEmpty()) {
            $this->table(
                ['ID', 'Project', 'Respondent', 'Channel now', 'Status'],
                $doublePaid->map(fn ($row) => [$row->id, $row->internal_code, $row->respondent_id, $row->channel ?? '—', $row->status])->all()
            );
        }

        if (!$this->option('apply')) {
            if ($toFix->isNotEmpty()) {
                $this->line('');
                $this->comment('Nothing was changed. Run again with --apply to correct the respondents above.');
            }

            return self::SUCCESS;
        }

        DB::transaction(function () use ($toFix) {
            foreach ($toFix as $row) {
                DB::table('project_respondents')->where('id', $row->id)->update($this->changes($row));
            }
        });

        // The refusal reasons are cleared from the respondents, so keep them here.
        Log::info('gifts:fix-channels corrected respondents', [
            'respondents' => $toFix->map(fn ($row) => [
                'id' => $row->id,
                'channel' => $row->channel,
                'status' => $row->status,
                'reject_message' => $row->reject_message,
                'changes' => $this->changes($row),
            ])->values()->all(),
        ]);

        $this->line('');
        $this->info("Corrected {$toFix->count()} respondent(s).");

        return self::SUCCESS;
    }

    /**
     * @return array<string, string|null>
     */
    private function changes(object $row): array
    {
        $changes = [];

        if ($row->channel !== $this->deliveredBy($row)) {
            $changes['channel'] = $this->deliveredBy($row);
        }

        // Nobody can refuse once paid: the refusal came from re-opening the interview afterwards.
        if ($row->status === ProjectRespondent::STATUS_RESPONDENT_REJECTED) {
            $changes['status'] = ProjectRespondent::STATUS_RESPONDENT_GIFT_RECEIVED;
            $changes['reject_message'] = null;
        }

        return $changes;
    }

    private function respondentsWithDeliveredGifts(): Collection
    {
        $byVinnet = DB::table('project_vinnet_transactions')
            ->select('project_respondent_id')
            ->where('vinnet_token_status', TransactionStatus::STATUS_VERIFIED)
            ->distinct();

        $byGotit = DB::table('project_gotit_voucher_transactions')
            ->select('project_respondent_id')
            ->where('voucher_status', ProjectGotItVoucherTransaction::STATUS_VOUCHER_SUCCESS)
            ->distinct();

        return DB::table('project_respondents as pr')
            ->leftJoin('projects as p', 'p.id', '=', 'pr.project_id')
            ->leftJoinSub($byVinnet, 'v', 'v.project_respondent_id', '=', 'pr.id')
            ->leftJoinSub($byGotit, 'g', 'g.project_respondent_id', '=', 'pr.id')
            ->where(fn ($q) => $q->whereNotNull('v.project_respondent_id')->orWhereNotNull('g.project_respondent_id'))
            ->when($this->option('project'), fn ($q, $projectId) => $q->where('pr.project_id', $projectId))
            ->orderBy('pr.id')
            ->get([
                'pr.id',
                'p.internal_code',
                'pr.respondent_id',
                'pr.channel',
                'pr.status',
                'pr.reject_message',
                DB::raw('v.project_respondent_id IS NOT NULL as by_vinnet'),
                DB::raw('g.project_respondent_id IS NOT NULL as by_gotit'),
            ])
            ->map(function ($row) {
                $row->by_vinnet = (bool) $row->by_vinnet;
                $row->by_gotit = (bool) $row->by_gotit;

                return $row;
            });
    }

    private function deliveredBy(object $row): string
    {
        return $row->by_gotit ? 'gotit' : 'vinnet';
    }
}
