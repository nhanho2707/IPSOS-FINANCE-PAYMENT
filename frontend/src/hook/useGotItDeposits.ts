import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ApiConfig } from "../config/ApiConfig";
import { GotItDeposit } from "../config/FinanceConfig";
import { ActionState } from "../components/Table/ReusableTable";
import i18n from "../i18n/i18n";

// Loads only while the history is open, so it is fresh each time it is shown.
export function useGotItDeposits(accountType: string, open: boolean) {

    const [ deposits, setDeposits ] = useState<GotItDeposit[]>([]);

    const [ actionState, setActionState ] = useState<ActionState>({
        type: 'idle',
        loading: false,
        error: false,
        message: ""
    });

    const [ page, setPage ] = useState(0);
    const [ rowsPerPage, setRowsPerPage ] = useState(10);
    const [ total, setTotal ] = useState(0);

    const fetchDeposits = useCallback(async () => {
        if (!open) return;

        try {
            setActionState({ type: 'fetch', loading: true, error: false, message: "" });

            const token = localStorage.getItem('authToken');
            const url = ApiConfig.gotit.depositHistory.replace('{accountType}', accountType);

            const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: {
                    page: page + 1,
                    per_page: rowsPerPage
                }
            });

            setDeposits(response.data.data);
            setTotal(response.data.meta.total);

            setActionState({ type: 'fetch', loading: false, error: false, message: "" });
        } catch (error: unknown) {
            setActionState({ type: 'fetch', loading: false, error: true, message: i18n.t('finance.depositHistory.loadFailed') });
        }
    }, [accountType, open, page, rowsPerPage]);

    useEffect(() => {
        if (!open) setPage(0);
    }, [open]);

    useEffect(() => {
        fetchDeposits();
    }, [fetchDeposits]);

    return {
        deposits,
        actionState,
        total,
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
        fetchDeposits
    };
}
