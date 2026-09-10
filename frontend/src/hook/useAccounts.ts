import { useCallback, useEffect, useState } from "react";
import { AccountData } from "../config/AccountFieldsConfig";
import { ApiConfig } from "../config/ApiConfig";
import axios from "axios";
import { ActionState } from "../components/Table/ReusableTable";

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

            const token = localStorage.getItem('authToken');
            
            const response = await axios.get(ApiConfig.account.viewAccounts, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: {
                    page: page + 1,
                    per_page: rowsPerPage,
                    searchTerm: searchTerm
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
        }catch(error: any){
            let message = 'Failed to fetch Accounts.';
            
            if(axios.isAxiosError(error)){
                message = error.response?.data.message || error.response?.data.error || error.message
            } else {
                message = error.response?.error
            }
            
            setActionState((prev) => ({
                ...prev,
                loading: false,
                error: true,
                ...(options?.silent ? {} : {
                    message: message
                })
            }));
        };

    }, [page, rowsPerPage, searchTerm]);

    const updateAccount = useCallback(async (id: number, payload: { role: number; department: number }) => {
        try {
            setActionState({ type: 'update', loading: true, error: false, message: "" });

            const token = localStorage.getItem('authToken');
            const url = ApiConfig.account.updateAccount.replace('{userId}', id.toString());

            const response = await axios.put(url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            setAccounts(prev => prev.map(a => a.id === id ? response.data.data : a));

            setActionState({ type: 'update', loading: false, error: false, message: response.data.message });

            return response.data.data;
        } catch (error: any) {
            let message = 'Failed to update Account.';

            if (axios.isAxiosError(error)) {
                message = error.response?.data.message || error.response?.data.error || error.message;
            }

            setActionState(prev => ({ ...prev, loading: false, error: true, message }));
            throw error;
        }
    }, []);

    const storeAccount = async (payload: AccountData) => {
        try{
            setActionState({
                type: 'store',
                loading: true,
                error: false,
                message: ""
            });
            
            const token = localStorage.getItem('authToken');

            const response = await axios.post(ApiConfig.account.storeAccount, payload, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            setActionState({
                type: 'store',
                loading: false,
                error: false,
                message: response.data.message
            });

            return response.data;
        }catch(error: any){
            let message = 'Failed to store Account.';
            
            if(axios.isAxiosError(error)){
                message = error.response?.data.message || error.response?.data.error || error.message
            } else {
                message = error.response?.error
            }
            
            setActionState((prev) => ({
                ...prev,
                loading: false,
                error: true,
                message: message
            }));
        };
    }

    useEffect(() => {
        fetchAcounts({silent: true});
    }, [page, rowsPerPage, searchTerm]);

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
        
        fetchAcounts,
        storeAccount,
        updateAccount
    }
}