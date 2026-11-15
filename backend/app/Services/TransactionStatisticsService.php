<?php

namespace App\Services;

use App\Constants\TransactionStatus;
use App\Models\ProjectRespondent;
use Carbon\Carbon;
use DateTimeImmutable;
use DateTimeZone;
use Generator;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Interview and gift statistics for one project, or for every project when the project id is 0.
 * The summary, the interview list and the Excel export all read the same rows, so their numbers agree.
 */
class TransactionStatisticsService
{
    // Interview times arrive from the survey link as Vietnam wall-clock time, while created_at is written in the app timezone.
    public const SURVEY_TIMEZONE = 'Asia/Ho_Chi_Minh';

    // Tablet and server clocks drift by a few minutes, so smaller negative waits are not worth checking.
    public const REVIEW_TOLERANCE_MINUTES = 5;

    public const CHANNELS = ['vinnet', 'gotit', 'other'];

    // Upper bound in minutes of each wait bucket, in display order; "early" is a gift sent before the interview ended.
    public const WAIT_BUCKETS = [
        'early' => -self::REVIEW_TOLERANCE_MINUTES - 1,
        'le15' => 15,
        'le60' => 60,
        'le360' => 360,
        'le1440' => 1440,
        'gt1440' => PHP_INT_MAX,
    ];

    public const VIEW_REVIEW = 'review';
    public const VIEW_ALL = 'all';
    public const VIEW_NO_GIFT = 'no_gift';
    public const VIEWS = [self::VIEW_REVIEW, self::VIEW_ALL, self::VIEW_NO_GIFT];

    public const SORTS = ['interview_start', 'gift_time', 'amount', 'wait_minutes', 'employee_id', 'respondent_id'];

    public const GIFT_STATUS_NONE = 'none';

    public function summary(int $projectId, array $filters): array
    {
        $summary = $this->aggregate($projectId, $filters);
        $previousRange = $this->previousRange($filters);

        $summary['previous'] = null;

        if ($previousRange) {
            $previous = $this->aggregate($projectId, array_merge($filters, $previousRange));

            $summary['previous'] = $previousRange + [
                'interviews' => $previous['interviews'],
                'gifts' => $previous['gifts'],
                'amount' => $previous['amount'],
                'median_wait_minutes' => $previous['wait']['median_minutes'],
                'review_total' => $previous['review_total'],
            ];
        }

        return $summary;
    }

    /**
     * One page of interviews. The wait is computed in PHP (two clocks, two timezones), so the rows are
     * ranked from a light first pass and only the requested page is read in full.
     */
    public function interviews(int $projectId, array $filters, array $options): array
    {
        $view = $options['view'] ?? self::VIEW_REVIEW;
        $sort = $options['sort'] ?? ($view === self::VIEW_REVIEW ? 'wait_minutes' : 'interview_start');
        $descending = ($options['direction'] ?? ($view === self::VIEW_REVIEW ? 'asc' : 'desc')) === 'desc';
        $perPage = (int) ($options['per_page'] ?? 10);
        $page = max(1, (int) ($options['page'] ?? 1));

        $counts = array_fill_keys(self::VIEWS, 0);
        $ranked = [];

        foreach ($this->rows($projectId, $filters, $options['search'] ?? null) as $row) {
            if (!$this->passes($row, $filters)) continue;

            foreach (self::VIEWS as $candidate) {
                if ($this->inView($row, $candidate)) $counts[$candidate]++;
            }

            if ($this->inView($row, $view)) {
                $ranked[] = [$row[$sort], $row['id']];
            }
        }

        usort($ranked, function (array $a, array $b) use ($descending) {
            // Interviews without a value (no gift, no measurable wait) stay at the end in both directions.
            if ($a[0] === null || $b[0] === null) {
                return ($a[0] === null) <=> ($b[0] === null) ?: $a[1] <=> $b[1];
            }

            return ($descending ? $b[0] <=> $a[0] : $a[0] <=> $b[0]) ?: $a[1] <=> $b[1];
        });

        $ids = array_column(array_slice($ranked, ($page - 1) * $perPage, $perPage), 1);
        $pageRows = [];

        if ($ids) {
            foreach ($this->rows($projectId, [], null, $ids) as $row) {
                $pageRows[$row['id']] = $row;
            }
        }

        return [
            'data' => array_values(array_filter(array_map(fn ($id) => $pageRows[$id] ?? null, $ids))),
            'meta' => [
                'total' => count($ranked),
                'page' => $page,
                'per_page' => $perPage,
                'counts' => $counts,
            ],
        ];
    }

    public function exportHeadings(): array
    {
        return [
            'Project code',
            'Project name',
            'Respondent ID',
            'Phone',
            'Channel',
            'Interviewer ID',
            'Interviewer',
            'Interview start',
            'Interview end',
            'Gift received',
            'Gift value',
            'Wait (minutes)',
            'Gift status',
            'Offline import',
            'Needs review',
        ];
    }

    public function exportRows(int $projectId, array $filters, array $options): Generator
    {
        $view = $options['view'] ?? self::VIEW_ALL;

        foreach ($this->rows($projectId, $filters, $options['search'] ?? null) as $row) {
            if (!$this->passes($row, $filters) || !$this->inView($row, $view)) continue;

            yield [
                $row['project_code'],
                $row['project_name'],
                $row['respondent_id'],
                $this->maskPhone($row['phone']),
                $row['channel'],
                $row['employee_id'],
                $row['employee_name'],
                $row['interview_start'],
                $row['interview_end'],
                $row['gift_time'],
                $row['gifted'] ? $row['amount'] : null,
                $row['wait_minutes'],
                $row['gift_status'],
                $row['offline'] ? 'Yes' : 'No',
                $row['needs_review'] ? 'Yes' : 'No',
            ];
        }
    }

    private function aggregate(int $projectId, array $filters): array
    {
        $interviews = 0;
        $gifts = 0;
        $amount = 0.0;
        $reviewTotal = 0;
        $byChannel = array_fill_keys(self::CHANNELS, ['interviews' => 0, 'gifts' => 0, 'amount' => 0.0]);
        $waits = [];
        $waitUnknown = 0;
        $waitOffline = 0;
        $waitBuckets = array_fill_keys(array_keys(self::WAIT_BUCKETS), 0);
        $interviewHours = array_fill(0, 24, 0);
        $giftHours = array_fill(0, 24, 0);
        $weekdayHours = array_fill(0, 7, array_fill(0, 24, 0));
        $daily = [];
        $byEmployee = [];
        $byProject = [];

        foreach ($this->rows($projectId, $filters) as $row) {
            // Each breakdown ignores the filter on its own dimension, so picking a bar narrows the
            // other charts while the chart it was picked from still shows the alternatives.
            $employeeOk = $this->passesEmployee($row, $filters);
            $waitOk = $this->passesWait($row, $filters);
            $slotOk = $this->passesSlot($row, $filters);

            if ($waitOk && $slotOk) {
                $this->addToGroup($byEmployee, $row['employee_id'] ?? '', $row, [
                    'employee_id' => $row['employee_id'],
                    'employee_name' => $row['employee_name'],
                ]);
            }

            if ($employeeOk && $slotOk && $row['wait_bucket'] !== null) {
                $waitBuckets[$row['wait_bucket']]++;
            }

            if ($employeeOk && $waitOk) {
                if ($row['hour'] !== null) {
                    $interviewHours[$row['hour']]++;
                    $weekdayHours[$row['weekday'] - 1][$row['hour']]++;
                }

                if ($row['gift_hour'] !== null) $giftHours[$row['gift_hour']]++;
            }

            if (!($employeeOk && $waitOk && $slotOk)) continue;

            $interviews++;
            $byChannel[$row['channel']]['interviews']++;

            if ($projectId === 0) {
                $this->addToGroup($byProject, $row['project_id'], $row, [
                    'project_id' => $row['project_id'],
                    'internal_code' => $row['project_code'],
                    'project_name' => $row['project_name'],
                ]);
            }

            if ($row['day'] !== null) {
                $daily[$row['day']] ??= [
                    'date' => $row['day'],
                    'interviews' => 0,
                    'gifts' => array_fill_keys(self::CHANNELS, 0),
                    'amount' => array_fill_keys(self::CHANNELS, 0.0),
                ];
                $daily[$row['day']]['interviews']++;
            }

            if (!$row['gifted']) continue;

            $gifts++;
            $amount += $row['amount'];
            $byChannel[$row['channel']]['gifts']++;
            $byChannel[$row['channel']]['amount'] += $row['amount'];

            if ($row['day'] !== null) {
                $daily[$row['day']]['gifts'][$row['channel']]++;
                $daily[$row['day']]['amount'][$row['channel']] += $row['amount'];
            }

            if ($row['offline']) {
                $waitOffline++;
            } elseif ($row['wait_minutes'] === null) {
                $waitUnknown++;
            } else {
                $waits[] = $row['wait_minutes'];
            }

            if ($row['needs_review']) $reviewTotal++;
        }

        ksort($daily);

        return [
            'interviews' => $interviews,
            'gifts' => $gifts,
            'amount' => $amount,
            'by_channel' => $byChannel,
            'review_total' => $reviewTotal,
            'wait' => [
                'median_minutes' => $this->median($waits),
                'measured' => count($waits),
                'unknown' => $waitUnknown,
                'offline' => $waitOffline,
                'tolerance_minutes' => self::REVIEW_TOLERANCE_MINUTES,
                'buckets' => array_map(fn ($key) => ['key' => $key, 'count' => $waitBuckets[$key]], array_keys($waitBuckets)),
            ],
            'interview_hours' => $interviewHours,
            'gift_hours' => $giftHours,
            'weekday_hours' => $weekdayHours,
            'daily' => array_values($daily),
            'by_employee' => $this->finishGroups($byEmployee),
            'by_project' => $this->finishGroups($byProject),
        ];
    }

    private function addToGroup(array &$groups, int|string $key, array $row, array $identity): void
    {
        $groups[$key] ??= $identity + ['interviews' => 0, 'gifts' => 0, 'amount' => 0.0, 'review' => 0, 'waits' => []];
        $groups[$key]['interviews']++;

        if (!$row['gifted']) return;

        $groups[$key]['gifts']++;
        $groups[$key]['amount'] += $row['amount'];

        if ($row['wait_minutes'] !== null) $groups[$key]['waits'][] = $row['wait_minutes'];
        if ($row['needs_review']) $groups[$key]['review']++;
    }

    private function finishGroups(array $groups): array
    {
        $groups = array_map(function (array $group) {
            $group['median_wait_minutes'] = $this->median($group['waits']);
            unset($group['waits']);

            return $group;
        }, array_values($groups));

        usort($groups, fn ($a, $b) => $b['interviews'] <=> $a['interviews']);

        return $groups;
    }

    /**
     * Live interviews with their gift, one row per respondent. Only filters the database can apply
     * are applied here; the ones that depend on the computed wait are checked with passes().
     */
    private function rows(int $projectId, array $filters, ?string $search = null, ?array $ids = null): Generator
    {
        $appTimezone = new DateTimeZone(config('app.timezone'));
        $surveyTimezone = new DateTimeZone(self::SURVEY_TIMEZONE);

        foreach ($this->query($projectId, $filters, $search, $ids)->cursor() as $row) {
            yield $this->normalise($row, $appTimezone, $surveyTimezone);
        }
    }

    private function query(int $projectId, array $filters, ?string $search, ?array $ids): Builder
    {
        // A respondent can hold several successful rows (Vinnet split cards, several GotIt vouchers),
        // so collapse them to one gift per respondent before counting.
        $vinnetGifts = DB::table('project_vinnet_transactions')
            ->select('project_respondent_id', DB::raw('MIN(created_at) as gift_time'), DB::raw('SUM(total_amt) as amount'))
            ->where('vinnet_token_message', TransactionStatus::VINNET_SUCCESS)
            ->groupBy('project_respondent_id');

        $gotitGifts = DB::table('project_gotit_voucher_transactions')
            ->select('project_respondent_id', DB::raw('MIN(created_at) as gift_time'), DB::raw('SUM(voucher_value) as amount'))
            ->where(function ($q) {
                $q->where('voucher_status', TransactionStatus::GOTIT_SUCCESS)
                    ->orWhere('voucher_status', 'LIKE', 'Voucher được cancelled by GotIt ngày%');
            })
            ->groupBy('project_respondent_id');

        if ($ids !== null) {
            $vinnetGifts->whereIn('project_respondent_id', $ids);
            $gotitGifts->whereIn('project_respondent_id', $ids);
        } elseif ($projectId !== 0) {
            $projectRespondentIds = DB::table('project_respondents')->select('id')->where('project_id', $projectId);

            $vinnetGifts->whereIn('project_respondent_id', $projectRespondentIds);
            $gotitGifts->whereIn('project_respondent_id', $projectRespondentIds);
        }

        $query = DB::table('project_respondents as pr')
            ->leftJoinSub($vinnetGifts, 'vg', 'vg.project_respondent_id', '=', 'pr.id')
            ->leftJoinSub($gotitGifts, 'gg', 'gg.project_respondent_id', '=', 'pr.id')
            ->leftJoin('employees', 'employees.id', '=', 'pr.employee_id')
            ->leftJoin('project_respondent_tokens as prt', 'prt.project_respondent_id', '=', 'pr.id')
            ->leftJoin('projects as p', 'p.id', '=', 'pr.project_id')
            ->where('pr.environment', ProjectRespondent::ENVIRONMENT_LIVE)
            ->whereIn('pr.channel', self::CHANNELS);

        if ($projectId !== 0) {
            $query->where('pr.project_id', $projectId);
        }

        if ($ids !== null) {
            $query->whereIn('pr.id', $ids);
        }

        if (!empty($filters['channel'])) {
            $query->where('pr.channel', $filters['channel']);
        }

        // A plain range instead of whereDate() keeps an index on interview_start usable.
        if (!empty($filters['date_from'])) {
            $query->where('pr.interview_start', '>=', Carbon::parse($filters['date_from'])->startOfDay()->toDateTimeString());
        }

        if (!empty($filters['date_to'])) {
            $query->where('pr.interview_start', '<', Carbon::parse($filters['date_to'])->addDay()->startOfDay()->toDateTimeString());
        }

        if ($search !== null && trim($search) !== '') {
            $like = '%' . addcslashes(trim($search), '\\%_') . '%';

            $query->where(function ($q) use ($like) {
                $q->where('pr.respondent_id', 'LIKE', $like)
                    ->orWhere('pr.respondent_phone_number', 'LIKE', $like)
                    ->orWhere('employees.employee_id', 'LIKE', $like)
                    ->orWhere('employees.first_name', 'LIKE', $like)
                    ->orWhere('employees.last_name', 'LIKE', $like);
            });
        }

        return $query
            ->select(
                'pr.id',
                'pr.project_id',
                'pr.channel',
                'pr.status',
                'pr.interview_start',
                'pr.interview_end',
                'pr.respondent_id',
                'pr.respondent_phone_number',
                'vg.gift_time as vinnet_gift_time',
                'gg.gift_time as gotit_gift_time',
                DB::raw('COALESCE(vg.amount, 0) + COALESCE(gg.amount, 0) as amount'),
                'employees.employee_id as employee_code',
                'employees.first_name',
                'employees.last_name',
                'prt.batch_id',
                'p.internal_code',
                'p.project_name'
            )
            ->orderBy('pr.id');
    }

    private function normalise(object $row, DateTimeZone $appTimezone, DateTimeZone $surveyTimezone): array
    {
        // A respondent paid through both providers received the gift at the earlier of the two.
        $giftTimes = array_filter([$row->vinnet_gift_time, $row->gotit_gift_time]);
        $giftTime = $giftTimes ? (new DateTimeImmutable(min($giftTimes), $appTimezone))->setTimezone($surveyTimezone) : null;

        // Offline imports stamp interview_start/end with the import time, so they say nothing about the interview.
        $offline = !empty($row->batch_id);
        $start = $row->interview_start ? new DateTimeImmutable($row->interview_start, $surveyTimezone) : null;
        $end = $row->interview_end ? new DateTimeImmutable($row->interview_end, $surveyTimezone) : null;

        $waitMinutes = $giftTime && $end && !$offline
            ? (int) round(($giftTime->getTimestamp() - $end->getTimestamp()) / 60)
            : null;

        return [
            'id' => (int) $row->id,
            'project_id' => (int) $row->project_id,
            'project_code' => $row->internal_code,
            'project_name' => $row->project_name,
            'respondent_id' => $row->respondent_id,
            'phone' => $row->respondent_phone_number,
            'channel' => $row->channel,
            'employee_id' => $row->employee_code,
            'employee_name' => trim($row->first_name . ' ' . $row->last_name),
            'interview_start' => $start?->format('Y-m-d H:i:s'),
            'interview_end' => $end?->format('Y-m-d H:i:s'),
            'gift_time' => $giftTime?->format('Y-m-d H:i:s'),
            'amount' => (float) $row->amount,
            'gifted' => $giftTime !== null,
            'gift_status' => $this->giftStatus($giftTime !== null, $row->status),
            'offline' => $offline,
            'wait_minutes' => $waitMinutes,
            'wait_bucket' => $waitMinutes === null ? null : $this->waitBucket($waitMinutes),
            'needs_review' => $waitMinutes !== null && $waitMinutes < -self::REVIEW_TOLERANCE_MINUTES,
            'day' => $start?->format('Y-m-d'),
            'weekday' => $start && !$offline ? (int) $start->format('N') : null,
            'hour' => $start && !$offline ? (int) $start->format('G') : null,
            'gift_hour' => $giftTime ? (int) $giftTime->format('G') : null,
        ];
    }

    private function giftStatus(bool $gifted, ?string $respondentStatus): string
    {
        if ($gifted) return ProjectRespondent::GIFT_STATUS_SUCCESS;

        $status = ProjectRespondent::giftStatus($respondentStatus);

        // Marked as received without a successful Vinnet or GotIt transaction behind it.
        return $status === ProjectRespondent::GIFT_STATUS_SUCCESS ? self::GIFT_STATUS_NONE : $status;
    }

    private function waitBucket(int $minutes): string
    {
        foreach (self::WAIT_BUCKETS as $key => $upTo) {
            if ($minutes <= $upTo) return $key;
        }

        return array_key_last(self::WAIT_BUCKETS);
    }

    private function passes(array $row, array $filters): bool
    {
        return $this->passesEmployee($row, $filters) && $this->passesWait($row, $filters) && $this->passesSlot($row, $filters);
    }

    private function passesEmployee(array $row, array $filters): bool
    {
        return empty($filters['employee']) || $row['employee_id'] === $filters['employee'];
    }

    private function passesWait(array $row, array $filters): bool
    {
        return empty($filters['wait']) || $row['wait_bucket'] === $filters['wait'];
    }

    private function passesSlot(array $row, array $filters): bool
    {
        $weekday = $filters['weekday'] ?? null;
        $hour = $filters['hour'] ?? null;

        return ($weekday === null || $weekday === '' || $row['weekday'] === (int) $weekday)
            && ($hour === null || $hour === '' || $row['hour'] === (int) $hour);
    }

    private function inView(array $row, string $view): bool
    {
        return match ($view) {
            self::VIEW_REVIEW => $row['needs_review'],
            self::VIEW_NO_GIFT => !$row['gifted'],
            default => true,
        };
    }

    // The period of the same length right before the selected one, for the "versus previous period" figures.
    private function previousRange(array $filters): ?array
    {
        if (empty($filters['date_from']) || empty($filters['date_to'])) return null;

        $from = Carbon::parse($filters['date_from'])->startOfDay();
        $days = (int) $from->diffInDays(Carbon::parse($filters['date_to'])->startOfDay()) + 1;

        return [
            'date_from' => $from->copy()->subDays($days)->toDateString(),
            'date_to' => $from->copy()->subDay()->toDateString(),
        ];
    }

    private function median(array $values): ?int
    {
        if (!$values) return null;

        sort($values);
        $middle = intdiv(count($values), 2);

        return count($values) % 2 ? $values[$middle] : (int) round(($values[$middle - 1] + $values[$middle]) / 2);
    }

    private function maskPhone(?string $phone): string
    {
        $phone = (string) $phone;

        if (strlen($phone) <= 6) return $phone;

        return substr($phone, 0, 3) . str_repeat('*', strlen($phone) - 6) . substr($phone, -3);
    }
}
