import dayjs, { Dayjs } from "dayjs";

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
    const label = STATUS_LABELS[key] ?? key.replace(/_/g, " ");
    return label.charAt(0).toUpperCase() + label.slice(1);
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
    return number === null ? "—" : `${integerFormat.format(number)} ₫`;
}

export function formatPercent(ratio: number): string {
    return percentFormat.format(ratio);
}

// "02 Nov 2026" reads the same whether the reader expects dd/mm or mm/dd, unlike 10/11/2026.
// The date pickers use it too (LocalizationProvider in index.tsx).
export const DATE_FORMAT = "DD MMM YYYY";

const toDate = (value: DateInput): Dayjs | null => {
    if (value === null || value === undefined || value === "") return null;
    const date = dayjs(value);
    return date.isValid() ? date : null;
};

export function formatDate(value: DateInput): string {
    return toDate(value)?.format(DATE_FORMAT) ?? "—";
}

export function formatDateTime(value: DateInput): string {
    return toDate(value)?.format(`${DATE_FORMAT}, HH:mm`) ?? "—";
}

export function formatDateRange(from: DateInput, to: DateInput): string | null {
    const start = toDate(from);
    const end = toDate(to);
    if (!start || !end) return null;

    return start.year() === end.year()
        ? `${start.format("D MMM")} – ${end.format("D MMM YYYY")}`
        : `${start.format("D MMM YYYY")} – ${end.format("D MMM YYYY")}`;
}
