import { useCallback, useEffect, useState } from "react";
import { ApiConfig } from "../config/ApiConfig";
import axios from "axios";

export interface TransactionAnomaly {
    respondent_id: string;
    phone: string;
    channel: string;
    employee_id: string;
    employee_name: string;
    interview_end: string;
    gift_time: string;
    gap_minutes: number;
}

export interface TransactionStatisticsData {
    total: number;
    interview_time_buckets: Record<string, number>;
    gift_time_buckets: Record<string, number>;
    gap_buckets: Record<string, number>;
    anomalies: TransactionAnomaly[];
    anomalies_total: number;
}

export function useTransactionStatistics(projectId: number) {

    const [ statistics, setStatistics ] = useState<TransactionStatisticsData | null>(null);
    const [ loading, setLoading ] = useState(false);
    const [ error, setError ] = useState(false);
    const [ message, setMessage ] = useState("");

    const [ channel, setChannel ] = useState("");
    const [ dateFrom, setDateFrom ] = useState<string | null>(null);
    const [ dateTo, setDateTo ] = useState<string | null>(null);

    const fetchStatistics = useCallback(async () => {
        try {
            setLoading(true);
            setError(false);
            setMessage("");

            const token = localStorage.getItem('authToken');

            const url = ApiConfig.project.viewTransactionStatistics.replace("{projectId}", projectId.toString());

            const response = await axios.get(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: {
                    channel: channel || undefined,
                    date_from: dateFrom || undefined,
                    date_to: dateTo || undefined
                }
            });

            setStatistics(response.data.data);
        } catch (error: any) {
            setError(true);
            setMessage(error.response?.data?.error || 'Failed to fetch transaction statistics');
        } finally {
            setLoading(false);
        }
    }, [projectId, channel, dateFrom, dateTo]);

    useEffect(() => {
        fetchStatistics();
    }, [fetchStatistics]);

    return {
        statistics,
        loading,
        error,
        message,
        channel,
        setChannel,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        fetchStatistics
    };
}
