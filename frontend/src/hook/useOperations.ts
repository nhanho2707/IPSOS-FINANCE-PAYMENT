import { useCallback, useEffect, useState } from "react";
import { ActionState } from "../components/Table/ReusableTable";
import { OperationsData } from "../config/QuotationConfig";
import { ApiConfig } from "../config/ApiConfig";
import axios from "axios";

export function useOperations(projectId: number) {
    
    const [ selectedOperations, setSelectedOperations ] = useState<OperationsData | null>(null);
    
    const [ actionState, setActionState ] = useState<ActionState>({
        type: 'idle',
        loading: false,
        error: false,
        message: ""
    });

    const getOperations = useCallback(async (quotationId: number, options?: { silent?: boolean, keepSelectedId?: number }) => {
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
                        
            const url = `${ApiConfig.project.getOperations
                            .replace("{projectId}", projectId.toString())
                            .replace("{versionId}", quotationId.toString())}`;

            const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            setSelectedOperations(response.data.data);

            setActionState((prev) => ({
                ...prev,
                loading: false,
                ...(options?.silent ? {} : { message: response.data.message })
            }));
        } catch(error: any){
            let message = 'Failed to get operations data.';
            
            if(axios.isAxiosError(error)){
                message = error.response?.data.message || error.response?.data.error || error.message
            } else {
                message = error.response?.error
            }

            if(error.response.status === 403){
                setActionState((prev) => ({
                    ...prev,
                    loading: false,
                    error: true,
                    message: message
                }));
            } else {
                setActionState((prev) => ({
                    ...prev,
                    loading: false,
                    error: true,
                    ...(options?.silent ? {} : {
                        message: message
                    })
                }));
            }
        }
    }, [projectId]);

    const addOperations = useCallback(async (versionId: number, payload:any) => {
        try
        {
            if(!projectId) return;

            setActionState({
                type: 'import',
                loading: true,
                error: false,
                message: ""
            });

            const token = localStorage.getItem('authToken');
                        
            const url = `${ApiConfig.project.addOperations
                                    .replace("{projectId}", projectId.toString())
                                    .replace("{versionId}", versionId.toString())}`;

            const response = await axios.post(url, {
                data: payload
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            setActionState({
                type: 'import',
                loading: false,
                error: false,
                message: response.data.message
            });

            return setSelectedOperations(response.data.data);
        } catch(error: any){
            let message = 'Failed to get operations data.';
            
            if(axios.isAxiosError(error)){
                message = error.response?.data.message || error.response?.data.error || error.message
            } else {
                message = error.response?.error
            }

            setActionState({
                type: 'import',
                loading: false,
                error: true,
                message: message
            });
        } 
    }, [projectId]);
    
    return {
        selectedOperations,
        actionState,
        getOperations,
        addOperations
    }
}