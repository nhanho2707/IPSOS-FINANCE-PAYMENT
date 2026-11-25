<?php

namespace App\Console\Commands;

use App\Constants\TransactionStatus;
use App\Models\ProjectGotItVoucherTransaction;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Before the cross-provider guard, re-opening an interview after a GotIt gift could send a Vinnet
 * request that overwrote the respondent's channel (and the reverse). This finds respondents whose
 * channel disagrees with the provider that actually delivered their gift.
 */
class FixGiftChannels extends Command
{
    protected $signature = 'gifts:fix-channels
                            {--project= : Only check this project id}
                            {--apply : Write the corrected channels; without it the command only reports}';

    protected $description = 'Find respondents whose recorded channel is not the provider that delivered their gift';

    public function handle(): int
    {
        $rows = $this->respondentsWithDeliveredGifts();

        $mislabelled = $rows->filter(fn ($row) => !($row->by_vinnet && $row->by_gotit) && $row->channel !== $this->deliveredBy($row));
        $doublePaid = $rows->filter(fn ($row) => $row->by_vinnet && $row->by_gotit);

        $this->info("Respondents with a delivered gift: {$rows->count()}");

        $this->line('');
        $this->info("Channel does not match the provider that delivered the gift: {$mislabelled->count()}");
        if ($mislabelled->isNotEmpty()) {
            $this->table(
                ['ID', 'Project', 'Respondent', 'Channel now', 'Delivered by', 'Status'],
                $mislabelled->map(fn ($row) => [$row->id, $row->internal_code, $row->respondent_id, $row->channel ?? '—', $this->deliveredBy($row), $row->status])->all()
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
            if ($mislabelled->isNotEmpty()) {
                $this->line('');
                $this->comment('Nothing was changed. Run again with --apply to correct the channels above.');
            }

            return self::SUCCESS;
        }

        DB::transaction(function () use ($mislabelled) {
            foreach ($mislabelled as $row) {
                DB::table('project_respondents')->where('id', $row->id)->update(['channel' => $this->deliveredBy($row)]);
            }
        });

        Log::info('gifts:fix-channels corrected channels', [
            'respondents' => $mislabelled->map(fn ($row) => ['id' => $row->id, 'from' => $row->channel, 'to' => $this->deliveredBy($row)])->values()->all(),
        ]);

        $this->line('');
        $this->info("Corrected {$mislabelled->count()} channel(s).");

        return self::SUCCESS;
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
