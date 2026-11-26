import { useCallback, useEffect, useRef, useState } from "react";
import { ApiConfig } from "../config/ApiConfig";
import axios from "axios";
import { ActionState } from "../components/Table/ReusableTable";
import { StatisticsFilters, statisticsParams, TransactionStatisticsData } from "../config/StatisticsConfig";
import i18n from "../i18n/i18n";

// Project id 0 means every project (Admin and Finance only).
export function useTransactionStatistics(projectId: number, filters: StatisticsFilters = {}) {

    const [ statistics, setStatistics ] = useState<TransactionStatisticsData | null>(null);

    const [ actionState, setActionState ] = useState<ActionState>({
        type: 'idle',
        loading: false,
        error: false,
        message: ""
    });

    const { channel, dateFrom, dateTo, employee, wait, weekday, hour } = filters;

    // Filters can change faster than the query answers; a late response for old filters must not overwrite the current one.
    const requestRef = useRef<AbortController | null>(null);

    const fetchStatistics = useCallback(async () => {
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;

        try {
            // The previous numbers stay on screen while the new ones load, so the charts do not jump.
            setActionState({ type: 'fetch', loading: true, error: false, message: "" });

            const token = localStorage.getItem('authToken');

            const url = ApiConfig.project.viewTransactionStatistics.replace("{projectId}", projectId.toString());

            const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: statisticsParams({ channel, dateFrom, dateTo, employee, wait, weekday, hour }),
                signal: controller.signal
            });

            setStatistics(response.data.data);
            setActionState((prev) => ({ ...prev, loading: false }));
        } catch (error: unknown) {
            if (axios.isCancel(error)) return;

            let message: string = i18n.t('statistics.errors.summary');

            if (axios.isAxiosError(error)) {
                message = error.response?.data?.message || error.response?.data?.error || error.message;
            }

            setStatistics(null);
            setActionState((prev) => ({ ...prev, loading: false, error: true, message }));
        }
    }, [projectId, channel, dateFrom, dateTo, employee, wait, weekday, hour]);

    useEffect(() => {
        fetchStatistics();
    }, [fetchStatistics]);

    useEffect(() => () => requestRef.current?.abort(), []);

    return {
        statistics,
        actionState,
        fetchStatistics
    };
}
