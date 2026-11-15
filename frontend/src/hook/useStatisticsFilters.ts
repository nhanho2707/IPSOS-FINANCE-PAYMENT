import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import { CHANNELS, StatisticsFilters, TransactionChannel, WAIT_BUCKET_LABELS, WaitBucketKey } from "../config/StatisticsConfig";

const DATE_PARAM_FORMAT = "YYYY-MM-DD";
const FILTER_PARAMS = ["from", "to", "range", "channel", "pvv", "wait", "wd", "hr"];

const toInteger = (value: string | null, min: number, max: number): number | null => {
    if (value === null || !/^\d+$/.test(value)) return null;
    const number = Number(value);
    return number >= min && number <= max ? number : null;
};

/**
 * The statistics filters live in the URL, so a filtered view survives a reload and can be shared.
 * `defaultDays` is the range shown when the URL names none (the all-projects view is too large for "all time").
 */
export function useStatisticsFilters(defaultDays: number | null = null) {
    const [ searchParams, setSearchParams ] = useSearchParams();

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const allTime = searchParams.get("range") === "all";
    const channelParam = searchParams.get("channel");
    const employee = searchParams.get("pvv");
    const waitParam = searchParams.get("wait");
    const weekday = toInteger(searchParams.get("wd"), 1, 7);
    const hour = toInteger(searchParams.get("hr"), 0, 23);

    const filters = useMemo<StatisticsFilters>(() => {
        const hasRange = Boolean(from && to && dayjs(from).isValid() && dayjs(to).isValid());
        const useDefault = !hasRange && !allTime && defaultDays !== null;

        return {
            dateFrom: hasRange ? from : useDefault ? dayjs().subtract(defaultDays - 1, "day").format(DATE_PARAM_FORMAT) : null,
            dateTo: hasRange ? to : useDefault ? dayjs().format(DATE_PARAM_FORMAT) : null,
            channel: CHANNELS.includes(channelParam as TransactionChannel) ? (channelParam as TransactionChannel) : "",
            employee: employee || null,
            wait: waitParam && waitParam in WAIT_BUCKET_LABELS ? (waitParam as WaitBucketKey) : null,
            weekday,
            hour,
        };
    }, [from, to, allTime, defaultDays, channelParam, employee, waitParam, weekday, hour]);

    const update = useCallback((changes: Record<string, string | number | null>) => {
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);

            Object.entries(changes).forEach(([key, value]) => {
                if (value === null || value === "") next.delete(key);
                else next.set(key, String(value));
            });

            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const setDateRange = useCallback((nextFrom: Dayjs | null, nextTo: Dayjs | null) => {
        if (nextFrom && nextTo) {
            update({ from: nextFrom.format(DATE_PARAM_FORMAT), to: nextTo.format(DATE_PARAM_FORMAT), range: null });
        } else {
            update({ from: null, to: null, range: defaultDays !== null ? "all" : null });
        }
    }, [update, defaultDays]);

    const setChannel = useCallback((channel: TransactionChannel | "") => update({ channel }), [update]);

    // Picking the value that is already selected clears it, so a second click on a bar undoes the first.
    const toggleEmployee = useCallback((code: string) => update({ pvv: code === employee ? null : code }), [update, employee]);

    const toggleWait = useCallback((key: WaitBucketKey) => update({ wait: key === filters.wait ? null : key }), [update, filters.wait]);

    const toggleSlot = useCallback((nextWeekday: number | null, nextHour: number) => {
        const same = nextWeekday === weekday && nextHour === hour;
        update({ wd: same ? null : nextWeekday, hr: same ? null : nextHour });
    }, [update, weekday, hour]);

    const clearSlot = useCallback(() => update({ wd: null, hr: null }), [update]);

    const reset = useCallback(() => update(Object.fromEntries(FILTER_PARAMS.map((key) => [key, null]))), [update]);

    const isFiltered = FILTER_PARAMS.some((key) => searchParams.has(key));

    return {
        filters,
        dateFrom: filters.dateFrom ? dayjs(filters.dateFrom) : null,
        dateTo: filters.dateTo ? dayjs(filters.dateTo) : null,
        setDateRange,
        setChannel,
        toggleEmployee,
        toggleWait,
        toggleSlot,
        clearSlot,
        reset,
        isFiltered,
    };
}
