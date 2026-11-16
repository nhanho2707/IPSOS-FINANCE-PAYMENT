import dayjs, { Dayjs } from "dayjs";
import i18n from "../i18n/i18n";

export function formatClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, "-");
}

export function toProperCase(str: string){
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

// Display names for raw status values from the backend; the values themselves stay unchanged.
const STATUS_LABELS: Record<string, string> = {
    "in coming": "Upcoming",
    "on going": "In field",
    "fm_confirmed": "FM confirmed",
    "suppended": "Suspended",
};

export function formatStatus(status: string | null | undefined): string {
    if (!status) return "";
    const key = status.trim().toLowerCase();
    const english = STATUS_LABELS[key] ?? key.replace(/_/g, " ");
    const fallback = english.charAt(0).toUpperCase() + english.slice(1);
    // A status the translations do not list is shown as the English fallback.
    return i18n.t(`common.status.${key}` as "common.status.planned", { defaultValue: fallback });
}

type NumericInput = number | string | null | undefined;
type DateInput = string | number | Date | Dayjs | null | undefined;

const integerFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const percentFormat = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

// Laravel returns decimal columns as strings, so numeric strings are accepted too.
const toNumber = (value: NumericInput): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

export function formatNumber(value: NumericInput): string {
    const number = toNumber(value);
    return number === null ? "—" : integerFormat.format(number);
}

// Every amount in this app is VND (Vinnet top-ups, GotIt vouchers, province prices).
export function formatMoney(value: NumericInput): string {
    const number = toNumber(value);
    // Non-breaking space: a wrapped line never starts with a lone "₫".
    return number === null ? "—" : `${integerFormat.format(number)}\u00a0₫`;
}

export function formatPercent(ratio: number): string {
    return percentFormat.format(ratio);
}

// English: "02 Nov 2026" reads the same whether the reader expects dd/mm or mm/dd, unlike 10/11/2026.
// Vietnamese: dd/mm/yyyy is the only order in use, so it stays numeric.
// The date pickers use it too (AppLocaleProvider).
const DATE_FORMATS = { en: "DD MMM YYYY", vi: "DD/MM/YYYY" } as const;

const isVietnamese = () => i18n.language === "vi";

export const dateFormat = (): string => DATE_FORMATS[isVietnamese() ? "vi" : "en"];

const toDate = (value: DateInput): Dayjs | null => {
    if (value === null || value === undefined || value === "") return null;
    const date = dayjs(value);
    return date.isValid() ? date : null;
};

export function formatDate(value: DateInput): string {
    return toDate(value)?.format(dateFormat()) ?? "—";
}

export function formatDateTime(value: DateInput): string {
    return toDate(value)?.format(`${dateFormat()}, HH:mm`) ?? "—";
}

export function formatDateRange(from: DateInput, to: DateInput): string | null {
    const start = toDate(from);
    const end = toDate(to);
    if (!start || !end) return null;

    if (isVietnamese()) {
        return start.year() === end.year()
            ? `${start.format("DD/MM")} – ${end.format("DD/MM/YYYY")}`
            : `${start.format("DD/MM/YYYY")} – ${end.format("DD/MM/YYYY")}`;
    }

    return start.year() === end.year()
        ? `${start.format("D MMM")} – ${end.format("D MMM YYYY")}`
        : `${start.format("D MMM YYYY")} – ${end.format("D MMM YYYY")}`;
}

// Vietnamese mobile numbers read as 4-3-3 ("0903 412 887"); anything else is shown as stored.
export function formatPhone(value: string | null | undefined): string {
    if (!value) return "—";
    const digits = value.replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) {
        return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    return value;
}

// How a field period reads today: "Starts in 8 days", "Ends in 28 days", "Ended 3 days ago".
export function formatFieldTiming(
    start: DateInput,
    end: DateInput,
    status?: string | null,
    today: Dayjs = dayjs()
): string | null {
    if (status === "completed") return i18n.t("common.fieldTiming.completed");
    if (status === "cancelled") return i18n.t("common.fieldTiming.cancelled");

    const from = toDate(start);
    const to = toDate(end);
    if (!from || !to) return null;

    const daysFromToday = (date: Dayjs) => date.startOf("day").diff(today.startOf("day"), "day");
    const untilStart = daysFromToday(from);
    const untilEnd = daysFromToday(to);

    if (untilStart > 0) return untilStart === 1 ? i18n.t("common.fieldTiming.startsTomorrow") : i18n.t("common.fieldTiming.startsIn", { count: untilStart });
    if (untilEnd > 0) return untilEnd === 1 ? i18n.t("common.fieldTiming.endsTomorrow") : i18n.t("common.fieldTiming.endsIn", { count: untilEnd });
    if (untilEnd === 0) return i18n.t("common.fieldTiming.endsToday");
    return untilEnd === -1 ? i18n.t("common.fieldTiming.endedYesterday") : i18n.t("common.fieldTiming.endedAgo", { count: -untilEnd });
}
