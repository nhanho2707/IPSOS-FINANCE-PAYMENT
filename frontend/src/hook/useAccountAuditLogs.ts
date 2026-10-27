import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ApiConfig } from "../config/ApiConfig";
import { AccountAuditLog } from "../config/AccountFieldsConfig";
import { ActionState } from "../components/Table/ReusableTable";
import { getAccountErrorMessage } from "./useAccounts";

export function useAccountAuditLogs(userId: number | null) {

    const [ logs, setLogs ] = useState<AccountAuditLog[]>([]);

    const [ actionState, setActionState ] = useState<ActionState>({
        type: 'idle',
        loading: false,
        error: false,
        message: ""
    });

    const [ page, setPage ] = useState(0);
    const [ rowsPerPage, setRowsPerPage ] = useState(10);
    const [ total, setTotal ] = useState(0);

    const fetchAuditLogs = useCallback(async () => {
        if (!userId) return;

        try {
            setActionState({ type: 'fetch', loading: true, error: false, message: "" });

            const token = localStorage.getItem('authToken');
            const url = ApiConfig.account.viewAccountAuditLogs.replace('{userId}', userId.toString());

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

            setLogs(response.data.data);
            setTotal(response.data.meta.total);

            setActionState({ type: 'fetch', loading: false, error: false, message: "" });
        } catch (error: unknown) {
            const message = getAccountErrorMessage(error, 'Failed to fetch account history.');

            setActionState({ type: 'fetch', loading: false, error: true, message });
        }
    }, [userId, page, rowsPerPage]);

    useEffect(() => {
        setPage(0);
        setLogs([]);
        setTotal(0);
    }, [userId]);

    useEffect(() => {
        fetchAuditLogs();
    }, [fetchAuditLogs]);

    return {
        logs,
        actionState,
        total,
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
        fetchAuditLogs
    };
}
