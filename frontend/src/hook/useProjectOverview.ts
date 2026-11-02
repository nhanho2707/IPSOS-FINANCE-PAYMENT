import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ApiConfig } from "../config/ApiConfig";
import { GiftStatusCounts } from "../config/OfflineProjectRespondentFieldsConfig";
import { QuotationVersionData } from "../config/QuotationConfig";
import { ActionState } from "../components/Table/ReusableTable";
import { TransactionStatisticsData } from "./useTransactionStatistics";

export interface ProjectOverviewAccess {
    statistics: boolean;
    gifts: boolean;
    quotation: boolean;
}

// The overview pulls from three endpoints with different role rules; each part is only requested
// when the role may read it, and a part that fails is shown as unavailable instead of failing the page.
export function useProjectOverview(projectId: number, access: ProjectOverviewAccess) {
    const [ statistics, setStatistics ] = useState<TransactionStatisticsData | null>(null);
    const [ giftCounts, setGiftCounts ] = useState<GiftStatusCounts | null>(null);
    const [ latestQuotation, setLatestQuotation ] = useState<QuotationVersionData | null>(null);

    const [ actionState, setActionState ] = useState<ActionState>({
        type: 'idle',
        loading: false,
        error: false,
        message: ""
    });

    const fetchOverview = useCallback(async () => {
        if (!projectId) return;

        setActionState({ type: 'fetch', loading: true, error: false, message: "" });

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem("authToken")}`
        };
        const id = projectId.toString();

        const loadStatistics = async (): Promise<TransactionStatisticsData | null> => {
            const response = await axios.get(ApiConfig.project.viewTransactionStatistics.replace("{projectId}", id), { headers });
            return response.data.data ?? null;
        };

        const loadGiftCounts = async (): Promise<GiftStatusCounts | null> => {
            const response = await axios.get(ApiConfig.project.viewOfflineProjectRespondents.replace("{projectId}", id), {
                headers,
                params: { page: 1, perPage: 1 }
            });
            return response.data.meta?.status_counts ?? null;
        };

        // Versions come newest first.
        const loadLatestQuotation = async (): Promise<QuotationVersionData | null> => {
            const response = await axios.get(ApiConfig.project.viewQuotationVersions.replace("{projectId}", id), { headers });
            return response.data.versions?.[0] ?? null;
        };

        const settle = <T,>(enabled: boolean, load: () => Promise<T | null>): Promise<T | null> =>
            enabled ? load().catch(() => null) : Promise.resolve(null);

        const [ nextStatistics, nextGiftCounts, nextQuotation ] = await Promise.all([
            settle(access.statistics, loadStatistics),
            settle(access.gifts, loadGiftCounts),
            settle(access.quotation, loadLatestQuotation),
        ]);

        setStatistics(nextStatistics);
        setGiftCounts(nextGiftCounts);
        setLatestQuotation(nextQuotation);
        setActionState({ type: 'fetch', loading: false, error: false, message: "" });
    }, [projectId, access.statistics, access.gifts, access.quotation]);

    useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);

    return { statistics, giftCounts, latestQuotation, actionState, fetchOverview };
}
