import { useCallback, useEffect, useRef, useState } from "react";
import { ApiConfig } from "../config/ApiConfig";
import axios from "axios";
import { ActionState } from "../components/Table/ReusableTable";

export type TransactionChannel = "vinnet" | "gotit" | "other";

export interface TransactionAnomaly {
    respondent_id: string;
    phone: string;
    channel: TransactionChannel;
    employee_id: string | null;
    employee_name: string;
    interview_end: string;
    gift_time: string;
    amount: number;
    gap_minutes: number;
}

export interface ChannelStatistics {
    count: number;
    amount: number;
}

export interface TransactionStatisticsData {
    total: number;
    total_amount: number;
    by_channel: Record<TransactionChannel, ChannelStatistics>;
    interview_time_buckets: Record<string, number>;
    gift_time_buckets: Record<string, number>;
    gap_buckets: Record<string, number>;
    gap_median_minutes: number | null;
    gap_unknown: number;
    gap_offline: number;
    anomaly_tolerance_minutes: number;
    anomalies: TransactionAnomaly[];
    anomalies_total: number;
}

export function useTransactionStatistics(projectId: number) {

    const [ statistics, setStatistics ] = useState<TransactionStatisticsData | null>(null);

    const [ actionState, setActionState ] = useState<ActionState>({
        type: 'idle',
        loading: false,
        error: false,
        message: ""
    });

    const [ channel, setChannel ] = useState<TransactionChannel | "">("");
    const [ dateFrom, setDateFrom ] = useState<string | null>(null);
    const [ dateTo, setDateTo ] = useState<string | null>(null);

    // Filters can change faster than the query answers; a late response for old filters must not overwrite the current one.
    const requestRef = useRef<AbortController | null>(null);

    const fetchStatistics = useCallback(async () => {
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;

        try {
            setActionState({ type: 'fetch', loading: true, error: false, message: "" });

            const token = localStorage.getItem('authToken');

            const url = ApiConfig.project.viewTransactionStatistics.replace("{projectId}", projectId.toString());

            const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: {
                    channel: channel || undefined,
                    date_from: dateFrom || undefined,
                    date_to: dateTo || undefined
                },
                signal: controller.signal
            });

            setStatistics(response.data.data);
            setActionState((prev) => ({ ...prev, loading: false }));
        } catch (error: unknown) {
            if (axios.isCancel(error)) return;

            let message = 'Failed to fetch transaction statistics.';

            if (axios.isAxiosError(error)) {
                message = error.response?.data?.message || error.response?.data?.error || error.message;
            }

            setStatistics(null);
            setActionState((prev) => ({ ...prev, loading: false, error: true, message }));
        }
    }, [projectId, channel, dateFrom, dateTo]);

    useEffect(() => {
        fetchStatistics();
    }, [fetchStatistics]);

    useEffect(() => () => requestRef.current?.abort(), []);

    return {
        statistics,
        actionState,
        channel,
        setChannel,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        fetchStatistics
    };
}
