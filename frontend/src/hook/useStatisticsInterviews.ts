import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { ApiConfig } from "../config/ApiConfig";
import { ActionState } from "../components/Table/ReusableTable";
import {
    InterviewRow,
    InterviewSort,
    InterviewView,
    SortDirection,
    StatisticsFilters,
    statisticsParams,
} from "../config/StatisticsConfig";

const DEFAULT_SORT: Record<InterviewView, { sort: InterviewSort; direction: SortDirection }> = {
    review: { sort: "wait_minutes", direction: "asc" },
    all: { sort: "interview_start", direction: "desc" },
    no_gift: { sort: "interview_start", direction: "desc" },
};

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("authToken")}` });

// With responseType 'blob' the server's JSON error arrives as a Blob and has to be read back as text.
const blobErrorMessage = async (error: unknown): Promise<string> => {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        try {
            const body = JSON.parse(await error.response.data.text());
            return body.message || body.error || error.message;
        } catch {
            return error.message;
        }
    }

    return error instanceof Error ? error.message : String(error);
};

// The interviews behind the statistics: one page at a time, with the same filters as the charts.
export function useStatisticsInterviews(projectId: number, filters: StatisticsFilters) {
    const [ rows, setRows ] = useState<InterviewRow[]>([]);
    const [ total, setTotal ] = useState(0);
    const [ counts, setCounts ] = useState<Record<InterviewView, number> | null>(null);
    const [ view, setViewState ] = useState<InterviewView>("review");
    const [ search, setSearchState ] = useState("");
    const [ sort, setSort ] = useState(DEFAULT_SORT.review);
    const [ page, setPage ] = useState(0);
    const [ rowsPerPage, setRowsPerPageState ] = useState(10);
    const [ exporting, setExporting ] = useState(false);

    const [ actionState, setActionState ] = useState<ActionState>({
        type: 'idle',
        loading: false,
        error: false,
        message: ""
    });

    const { channel, dateFrom, dateTo, employee, wait, weekday, hour } = filters;
    const requestRef = useRef<AbortController | null>(null);

    // A new set of filters starts again from the first page.
    useEffect(() => {
        setPage(0);
    }, [projectId, channel, dateFrom, dateTo, employee, wait, weekday, hour]);

    const fetchInterviews = useCallback(async () => {
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;

        try {
            setActionState({ type: 'fetch', loading: true, error: false, message: "" });

            const response = await axios.get(ApiConfig.project.viewStatisticsInterviews.replace("{projectId}", projectId.toString()), {
                headers: authHeaders(),
                params: {
                    ...statisticsParams({ channel, dateFrom, dateTo, employee, wait, weekday, hour }),
                    view,
                    search: search || undefined,
                    sort: sort.sort,
                    direction: sort.direction,
                    page: page + 1,
                    per_page: rowsPerPage,
                },
                signal: controller.signal,
            });

            setRows(response.data.data);
            setTotal(response.data.meta.total);
            setCounts(response.data.meta.counts);
            setActionState((prev) => ({ ...prev, loading: false }));
        } catch (error: unknown) {
            if (axios.isCancel(error)) return;

            let message = 'Failed to fetch the interviews.';

            if (axios.isAxiosError(error)) {
                message = error.response?.data?.message || error.response?.data?.error || error.message;
            }

            setRows([]);
            setTotal(0);
            setActionState((prev) => ({ ...prev, loading: false, error: true, message }));
        }
    }, [projectId, channel, dateFrom, dateTo, employee, wait, weekday, hour, view, search, sort, page, rowsPerPage]);

    useEffect(() => {
        fetchInterviews();
    }, [fetchInterviews]);

    useEffect(() => () => requestRef.current?.abort(), []);

    const setView = (next: InterviewView) => {
        setViewState(next);
        setSort(DEFAULT_SORT[next]);
        setPage(0);
    };

    const setSearch = (value: string) => {
        setSearchState(value.trim());
        setPage(0);
    };

    const toggleSort = (column: InterviewSort) => {
        setSort((current) => ({
            sort: column,
            direction: current.sort === column && current.direction === "asc" ? "desc" : "asc",
        }));
        setPage(0);
    };

    const setRowsPerPage = (value: number) => {
        setRowsPerPageState(value);
        setPage(0);
    };

    // Resolves to an error message, or null when the file was saved.
    const exportInterviews = async (fileName: string): Promise<string | null> => {
        try {
            setExporting(true);

            const response = await axios.get(ApiConfig.project.exportStatisticsInterviews.replace("{projectId}", projectId.toString()), {
                headers: authHeaders(),
                params: {
                    ...statisticsParams({ channel, dateFrom, dateTo, employee, wait, weekday, hour }),
                    view,
                    search: search || undefined,
                },
                responseType: "blob",
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            return null;
        } catch (error: unknown) {
            return await blobErrorMessage(error);
        } finally {
            setExporting(false);
        }
    };

    return {
        rows,
        total,
        counts,
        view,
        setView,
        search,
        setSearch,
        sort,
        toggleSort,
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
        actionState,
        exporting,
        exportInterviews,
    };
}
