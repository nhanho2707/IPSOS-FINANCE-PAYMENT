import { useCallback, useEffect, useState } from "react";
import { CATIBatchData } from "../config/MiniCATIFieldsConfig";
import axios from "axios";
import { ApiConfig } from "../config/ApiConfig";
import { ActionState, ActionType } from "../components/Table/ReusableTable";

export const useCATIBatch = (projectId: number) => {

    const [ batches, setBatches ] = useState<CATIBatchData[]>([])
    
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

    const fetchCATIBatches = useCallback(async (options?: { silent?: boolean}) => {
        try
        {
            if(!projectId) return;

            setActionState((prev) => ({
                ...prev,
                type: 'fetch',
                loading: true,
                ...(options?.silent ? {} : { message: "", error: false })
            }));

            const token = localStorage.getItem('authToken');

            const url = `${ApiConfig.minicati.showBatches.replace("{projectId}", projectId.toString())}`;

            const response = await axios.get(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: {
                    page: page + 1,
                    perPage: rowsPerPage,
                    searchTerm: searchTerm
                }
            });

            setBatches(response.data.data);
            setMeta(response.data.meta);
            setTotal(response.data.meta.total);

            setActionState((prev) => ({
                ...prev,
                loading: false,
                ...options?.silent ? {} : { message: response.data.message }
            }));
        } catch(error:any){
            setActionState((prev) => ({
                ...prev,
                loading: false,
                error: true,
                ...(options?.silent ? {} : {
                    message: error.response.data.error || 'Failed to fetch CATI Batches!'
                })
            }));
        }
    }, [page, rowsPerPage, searchTerm])

    const importCATIBatch = async (file: any, batchName: string) => {
        try
        {
            setActionState({
                type: 'import',
                loading: true,
                error: false,
                message: ""
            });

            const token = localStorage.getItem('authToken');

            const url = `${ApiConfig.minicati.importBatch.replace("{projectId}", projectId.toString())}`;

            const formData = new FormData();
            formData.append("file", file);
            formData.append("batch_name", batchName)

            const response = await axios.post(url, formData, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
            });

            setActionState({
                type: 'import',
                loading: false,
                error: false,
                message: response.data.message
            });

            await fetchCATIBatches({silent: true});
        } catch(error: any){
            setActionState({
                type: 'import',
                loading: false,
                error: true,
                message: error.response.data.message || 'Failed to import CATI Batch!'
            });
        }
    };

    const destroyBatch = async (batchId: number) => {
        try
        {
            setActionState({
                type: 'delete',
                loading: true,
                error: false,
                message: ""
            });

            const token = localStorage.getItem('authToken');

            const url = `${ApiConfig.minicati.destroyBatch.replace("{projectId}", projectId.toString()).replace('{batchId}', batchId.toString()) }`;

            const response = await axios.delete(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            if(response.data.status_code === 400){
                setActionState({
                    type: 'delete',
                    loading: false,
                    error: true,
                    message: response.data.error
                });
            } else {
                setActionState({
                    type: 'delete',
                    loading: false,
                    error: false,
                    message: response.data.message
                });

                await fetchCATIBatches({silent: true});
            }
        } catch(error: any){
            setActionState({
                type: 'delete',
                loading: false,
                error: true,
                message: error.response.data.error || 'Failed to delete CATI Batch!'
            });
        }
    }

    const updateStatus = async (batchId: number, status: string) => {
        try
        {
            setActionState({
                type: 'update',
                loading: false,
                error: false,
                message: ""
            });

            const token = localStorage.getItem('authToken');

            const url = `${ApiConfig.minicati.updateBatchStatus.replace("{projectId}", projectId.toString()).replace('{batchId}', batchId.toString()) }`;

            const response = await axios.put(url, { status: status }, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });
            
            const batch = response.data.data;

            setBatches((prev) => prev.map(b => b.id === batch.id ? {...b, status } : b))

            setActionState({
                    type: 'update',
                    loading: false,
                    error: true,
                    message: response.data.error
                });
        } catch(error: any){
            setActionState({
                type: 'update',
                loading: false,
                error: true,
                message: error.response.data.error || 'Failed to update CATI Batch!'
            });
        }
    }

    useEffect(() => {
        fetchCATIBatches({silent: true});
    }, [page, rowsPerPage, searchTerm])

    useEffect(() => {
        if(!actionState.message) return;

        const timer = setTimeout(() => {
            setActionState(prev => ({...prev, message: ""}));
        }, 3000);

        return () => clearTimeout(timer);
    }, [actionState.message])

    return {
        batches,
        actionState,
        meta,
        total,
        page,
        setPage,
        rowsPerPage,

        setActionState,

        setRowsPerPage,
        searchTerm,
        setSearchTerm,

        fetchCATIBatches,
        importCATIBatch,

        destroyBatch,
        updateStatus
    }
}