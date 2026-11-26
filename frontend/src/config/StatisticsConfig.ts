import { StatusTone } from "./ThemeConfig";
import i18n from "../i18n/i18n";

export type TransactionChannel = "vinnet" | "gotit" | "other";

export const CHANNELS: TransactionChannel[] = ["vinnet", "gotit", "other"];

export type ChannelValues = Record<TransactionChannel, number>;

export type WaitBucketKey = "early" | "le15" | "le60" | "le360" | "le1440" | "gt1440";

// The backend owns the bucket boundaries; "early" is a gift sent before the interview ended.
export const WAIT_BUCKETS: WaitBucketKey[] = ["early", "le15", "le60", "le360", "le1440", "gt1440"];

export const waitBucketLabel = (key: WaitBucketKey): string => i18n.t(`statistics.wait.${key}`);

// The ISO weekday (1 = Monday … 7 = Sunday) the API filters on.
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export const weekdayLabel = (weekday: number): string =>
    i18n.t(`statistics.weekdays.${String(weekday) as "1"}`);

export interface DailyStatistics {
    date: string;
    interviews: ChannelValues;
    gifts: ChannelValues;
    amount: ChannelValues;
}

export interface BreakdownStatistics {
    interviews: number;
    gifts: number;
    amount: number;
    review: number;
    median_wait_minutes: number | null;
}

export interface EmployeeStatistics extends BreakdownStatistics {
    employee_id: string | null;
    employee_name: string;
}

export interface ProjectStatistics extends BreakdownStatistics {
    project_id: number;
    internal_code: string | null;
    project_name: string | null;
}

export interface PreviousPeriodStatistics {
    date_from: string;
    date_to: string;
    interviews: number;
    gifts: number;
    amount: number;
    median_wait_minutes: number | null;
    review_total: number;
}

export interface TransactionStatisticsData {
    interviews: number;
    gifts: number;
    amount: number;
    by_channel: Record<TransactionChannel, { interviews: number; gifts: number; amount: number }>;
    review_total: number;
    wait: {
        median_minutes: number | null;
        measured: number;
        unknown: number;
        offline: number;
        tolerance_minutes: number;
        buckets: { key: WaitBucketKey; count: number }[];
    };
    interview_hours: number[];
    gift_hours: number[];
    weekday_hours: number[][];
    daily: DailyStatistics[];
    by_employee: EmployeeStatistics[];
    by_project: ProjectStatistics[];
    previous: PreviousPeriodStatistics | null;
}

export interface StatisticsFilters {
    channel?: TransactionChannel | "";
    dateFrom?: string | null;
    dateTo?: string | null;
    employee?: string | null;
    wait?: WaitBucketKey | null;
    weekday?: number | null;
    hour?: number | null;
}

export type InterviewGiftStatus = "success" | "pending" | "refused" | "failed" | "none";

const INTERVIEW_GIFT_STATUS_TONES: Record<InterviewGiftStatus, StatusTone> = {
    success: "success",
    pending: "warning",
    refused: "neutral",
    failed: "danger",
    none: "neutral",
};

export const interviewGiftStatus = (status: InterviewGiftStatus): { label: string; tone: StatusTone } => ({
    label: i18n.t(`statistics.giftStatus.${status}`),
    tone: INTERVIEW_GIFT_STATUS_TONES[status],
});

export interface InterviewRow {
    id: number;
    project_id: number;
    project_code: string | null;
    project_name: string | null;
    respondent_id: string | null;
    phone: string | null;
    channel: TransactionChannel;
    employee_id: string | null;
    employee_name: string;
    interview_start: string | null;
    interview_end: string | null;
    gift_time: string | null;
    amount: number;
    gifted: boolean;
    gift_status: InterviewGiftStatus;
    offline: boolean;
    wait_minutes: number | null;
    needs_review: boolean;
}

export type InterviewView = "review" | "all" | "no_gift";

export type InterviewSort = "interview_start" | "gift_time" | "amount" | "wait_minutes" | "employee_id" | "respondent_id";

export type SortDirection = "asc" | "desc";

export const formatMinutes = (minutes: number | null | undefined): string => {
    if (minutes === null || minutes === undefined) return "—";

    const sign = minutes < 0 ? "-" : "";
    const abs = Math.abs(minutes);

    if (abs < 60) return sign + i18n.t("statistics.duration.minutes", { m: abs });
    if (abs < 1440) return sign + i18n.t("statistics.duration.hours", { h: Math.floor(abs / 60), m: abs % 60 });

    return sign + i18n.t("statistics.duration.days", { d: Math.floor(abs / 1440), h: Math.floor((abs % 1440) / 60) });
};

// 0 → "00:00–01:00"
export const formatHourRange = (hour: number): string => {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${pad(hour)}:00–${pad((hour + 1) % 24)}:00`;
};

export const statisticsParams = (filters: StatisticsFilters) => ({
    channel: filters.channel || undefined,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
    employee: filters.employee || undefined,
    wait: filters.wait || undefined,
    weekday: filters.weekday ?? undefined,
    hour: filters.hour ?? undefined,
});
