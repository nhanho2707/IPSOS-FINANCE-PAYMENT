import { useCallback, useEffect, useState } from "react";
import { AccountData, AccountFilters, ResetPasswordPayload } from "../config/AccountFieldsConfig";
import { ApiConfig } from "../config/ApiConfig";
import axios from "axios";
import { ActionState } from "../components/Table/ReusableTable";

export const getAccountErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message || error.response?.data?.error || error.message || fallback;
    }
    return fallback;
};

const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
});

export function useAccounts() {

    const [ accounts, setAccounts ] = useState<AccountData[]>([]);

    const [ actionState, setActionState ] = useState<ActionState>({
        type: 'idle',
        loading: false,
        error: false,
        message: ""
    });

    const [ page, setPage ] = useState(0);
    const [ rowsPerPage, setRowsPerPage ] = useState(10);
    const [ searchTerm, setSearchTerm ] = useState("");
    const [ filters, setFilters ] = useState<AccountFilters>({ role_id: "", department_id: "", status: "" });

    const [ meta, setMeta ] = useState<any>(null);
    const [ total, setTotal ] = useState(0);

    const fetchAcounts = useCallback(async(options?: {silent?: boolean}) => {
        try{
            setActionState((prev) => ({
                ...prev,
                type: 'fetch',
                loading: true,
                ...(options?.silent ? {} : { message: "", error: false })
            }));

            const response = await axios.get(ApiConfig.account.viewAccounts, {
                headers: authHeaders(),
                params: {
                    page: page + 1,
                    per_page: rowsPerPage,
                    searchTerm: searchTerm || undefined,
                    role_id: filters.role_id || undefined,
                    department_id: filters.department_id || undefined,
                    status: filters.status || undefined,
                }
            });

            setAccounts(response.data.data);
            setMeta(response.data.meta);
            setTotal(response.data.meta.total);

            setActionState((prev) => ({
                ...prev,
                loading: false,
                ...options?.silent ? {} : { message: response.data.message }
            }));
        }catch(error: unknown){
            const message = getAccountErrorMessage(error, 'Failed to fetch Accounts.');

            setActionState((prev) => ({
                ...prev,
                loading: false,
                error: true,
                ...(options?.silent ? {} : {
                    message: message
                })
            }));
        };

    }, [page, rowsPerPage, searchTerm, filters]);

    const updateAccount = useCallback(async (id: number, payload: { role: number; department: number }) => {
        try {
            setActionState({ type: 'update', loading: true, error: false, message: "" });

            const url = ApiConfig.account.updateAccount.replace('{userId}', id.toString());

            const response = await axios.put(url, payload, { headers: authHeaders() });

            setAccounts(prev => prev.map(a => a.id === id ? response.data.data : a));

            setActionState({ type: 'update', loading: false, error: false, message: response.data.message });

            return response.data.data;
        } catch (error: unknown) {
            const message = getAccountErrorMessage(error, 'Failed to update Account.');

            setActionState(prev => ({ ...prev, loading: false, error: true, message }));
            throw error;
        }
    }, []);

    const updateAccountStatus = useCallback(async (id: number, isActive: boolean) => {
        try {
            setActionState({ type: 'update', loading: true, error: false, message: "" });

            const url = ApiConfig.account.updateAccountStatus.replace('{userId}', id.toString());

            const response = await axios.put(url, { is_active: isActive }, { headers: authHeaders() });

            setAccounts(prev => prev.map(a => a.id === id ? response.data.data : a));

            setActionState({ type: 'update', loading: false, error: false, message: response.data.message });

            return response.data.data;
        } catch (error: unknown) {
            const message = getAccountErrorMessage(error, 'Failed to update account status.');

            setActionState(prev => ({ ...prev, loading: false, error: true, message }));
            throw error;
        }
    }, []);

    const resetAccountPassword = useCallback(async (id: number, payload: ResetPasswordPayload) => {
        try {
            setActionState({ type: 'update', loading: true, error: false, message: "" });

            const url = ApiConfig.account.resetAccountPassword.replace('{userId}', id.toString());

            const response = await axios.put(url, payload, { headers: authHeaders() });

            setActionState({ type: 'update', loading: false, error: false, message: response.data.message });

            return response.data;
        } catch (error: unknown) {
            const message = getAccountErrorMessage(error, 'Failed to reset password.');

            setActionState(prev => ({ ...prev, loading: false, error: true, message }));
            throw error;
        }
    }, []);

    const storeAccount = useCallback(async (payload: AccountData) => {
        try{
            setActionState({ type: 'store', loading: true, error: false, message: "" });

            const response = await axios.post(ApiConfig.account.storeAccount, payload, { headers: authHeaders() });

            setActionState({ type: 'store', loading: false, error: false, message: response.data.message });

            if (page === 0) {
                await fetchAcounts({ silent: true });
            } else {
                setPage(0);
            }

            return response.data;
        }catch(error: unknown){
            const message = getAccountErrorMessage(error, 'Failed to store Account.');

            setActionState((prev) => ({ ...prev, loading: false, error: true, message }));
            throw error;
        };
    }, [page, fetchAcounts]);

    useEffect(() => {
        fetchAcounts({silent: true});
    }, [fetchAcounts]);

    return {
        accounts,
        actionState,
        meta,
        total,
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
        searchTerm,
        setSearchTerm,
        filters,
        setFilters,

        fetchAcounts,
        storeAccount,
        updateAccount,
        updateAccountStatus,
        resetAccountPassword
    }
}
