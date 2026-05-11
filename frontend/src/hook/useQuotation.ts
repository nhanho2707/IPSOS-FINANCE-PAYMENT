import { useCallback, useEffect, useState } from "react";
import { ApiConfig } from "../config/ApiConfig";
import axios from "axios";
import { QuotationVersionData } from "../config/QuotationConfig";
import { ProjectData } from "../config/ProjectFieldsConfig";
import { ActionState } from "../components/Table/ReusableTable";

export function useQuotation(projectId?: number) {
    const [ project, setProject ] = useState<ProjectData | null>(null); 
    const [ versions, setVersions ] = useState<QuotationVersionData[] | []>([]);
    const [ selectedVersion, setSelectedVersion ] = useState<QuotationVersionData | null>(null);
    const [ canEdit, setCanEdit ] = useState<boolean>(false);
    
    const [ actionState, setActionState ] = useState<ActionState>({
        type: 'idle',
        loading: false,
        error: false,
        message: ""
    });

    const getQuotationVersions = useCallback(async (options?: { silent?: boolean}) => {
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
                        
            const url = `${ApiConfig.project.viewQuotationVersions.replace("{projectId}", projectId.toString())}`;

            const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            setProject(response.data.project);
            setVersions(response.data.versions);

            if(response.data.versions.length > 0){
                const latest = response.data.versions[0];
                setSelectedVersion(latest);

                setCanEdit(true);
            } else {
                setCanEdit(false);
            }

            setActionState((prev) => ({
                ...prev,
                loading: false,
                ...options?.silent ? {} : { message: response.data.message }
            }));
        } catch(error: any){
            setActionState((prev) => ({
                ...prev,
                loading: false,
                error: true,
                ...(options?.silent ? {} : {
                    message: error.response.data.error || 'Failed to get quotation versions!'
                })
            }));
        }
    }, [projectId]);
    
    const addQuotation = useCallback(async (payload:any) => {
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
                        
            const url = `${ApiConfig.project.addQuotation.replace("{projectId}", projectId.toString())}`;

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

            return response.data.quotation;
        } catch(error: any){
            setActionState({
                type: 'import',
                loading: false,
                error: true,
                message: error.message || 'Failed to fetch Quotation'
            });
        } 
    }, [projectId]);

    const updateQuotationVersion = useCallback(async (payload: any) => {
        try
        {
            if (!projectId) return;
            if (!selectedVersion) return;

            setActionState({
                type: 'update',
                loading: true,
                error: false,
                message: ""
            });

            const token = localStorage.getItem('authToken');
                        
            const url = `${ApiConfig.project.updateQuotation.replace("{projectId}", projectId.toString()).replace("{versionId}", selectedVersion.id.toString())}`;

            const response = await axios.put(url, {
                data: payload
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            setSelectedVersion(response.data.quotation);
            setCanEdit(false);
            
            setActionState({
                type: 'update',
                loading: false,
                error: false,
                message: response.data.message
            });
        } catch(error: any){
            let message = 'Failed to update Quotation';

            if(axios.isAxiosError(error)){
                message = error.response?.data.message || error.response?.data.error || error.message
            } else {
                message = error.response?.error
            }

            setActionState({
                type: 'update',
                loading: false,
                error: true,
                message: message
            });
            
            throw error;
        } 
    }, [projectId, selectedVersion]);

    const destroyQuotationVersion = useCallback(async () => {
        try
        {
            if (!projectId) return;
            if (!selectedVersion) return;

            setActionState({
                type: 'delete',
                loading: true,
                error: false,
                message: ""
            });

            const token = localStorage.getItem('authToken');
                        
            const url = `${ApiConfig.project.destroyQuotationVersion.replace("{projectId}", projectId.toString()).replace("{versionId}", selectedVersion.id.toString())}`;

            const response = await axios.delete(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            setActionState({
                type: 'delete',
                loading: false,
                error: false,
                message: response.data.message
            });

            await getQuotationVersions({silent: true});
        } catch(error: any){
            let message = 'Failed to delete Quotation';

            if(axios.isAxiosError(error)){
                message = error.response?.data.message || error.response?.data.error || error.message
            } else {
                message = error.response?.error
            }

            setActionState({
                type: 'delete',
                loading: false,
                error: true,
                message: message
            });
        }
    }, [projectId, selectedVersion]);
    
    const cloneQuotationVersion = useCallback(async (selectedCloneVersion: QuotationVersionData) => {
        try
        {
            if(!projectId) return;

            setActionState({
                type: 'clone',
                loading: true,
                error: false,
                message: ""
            });

            const token = localStorage.getItem('authToken');

            const url = `${ApiConfig.project
                .cloneQuotationVersion.replace("{projectId}", projectId.toString())
                .replace("{versionId}", selectedCloneVersion.id.toString())}`;

            const response = await axios.post(url, null, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            setActionState({
                type: 'clone',
                loading: false,
                error: false,
                message: response.data.message
            });

            await getQuotationVersions({silent: true});
        } catch(error: any){
            let message = 'Failed to clone Quotation';

            if(axios.isAxiosError(error)){
                message = error.response?.data.message || error.response?.data.error || error.message
            } else {
                message = error.response?.error
            }

            setActionState({
                type: 'clone',
                loading: false,
                error: true,
                message: message
            });
        }
    }, [projectId]);
    
    const submitQuotationVersion = useCallback(async () => {
        try
        {
            if(!projectId) return;
            if(!selectedVersion) return;

            setActionState({
                type: 'update',
                loading: true,
                error: false,
                message: ""
            });

            const token = localStorage.getItem('authToken');

            const url = `${ApiConfig.project
                .submitQuotationVersion.replace("{projectId}", projectId.toString())
                .replace("{versionId}", selectedVersion.id.toString())}`;

            const response = await axios.put(url, null, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const version = response.data.data;

            setVersions(prev => prev?.map(v => v.id === version.id ? version: v));

            setSelectedVersion(response.data.data);

            setActionState({
                type: 'update',
                loading: false,
                error: false,
                message: response.data.message
            });
        } catch(error: any){
            let message = 'Failed to submit Quotation';

            if(axios.isAxiosError(error)){
                message = error.response?.data.message || error.response?.data.error || error.message
            } else {
                message = error.response?.error
            }

            setActionState({
                type: 'update',
                loading: false,
                error: true,
                message: message
            });
        }
    }, [projectId, selectedVersion]);

    const approveQuotationVersion = useCallback(async () => {
        try
        {
            if(!projectId) return;
            if(!selectedVersion) return;

            setActionState({
                type: 'update',
                loading: true,
                error: false,
                message: ""
            });

            const token = localStorage.getItem('authToken');

            const url = `${ApiConfig.project
                .approveQuotationVersion.replace("{projectId}", projectId.toString())
                .replace("{versionId}", selectedVersion.id.toString())}`;

            const response = await axios.put(url, null, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const version = response.data.data;

            setVersions(prev => prev?.map(v => v.id === version.id ? version: v));

            setSelectedVersion(response.data.data);

            setActionState({
                type: 'update',
                loading: false,
                error: false,
                message: response.data.message
            });
        } catch(error: any){
            let message = 'Failed to approve Quotation';

            if(axios.isAxiosError(error)){
                message = error.response?.data.message || error.response?.data.error || error.message
            } else {
                message = error.response?.error
            }

            setActionState({
                type: 'update',
                loading: false,
                error: true,
                message: message
            });
        }
    }, [projectId, selectedVersion]);

    useEffect(() => {
        getQuotationVersions();
    }, [projectId]);

    return {
        actionState,
        project,
        getQuotationVersions,
        versions,
        selectedVersion,
        setSelectedVersion,
        canEdit,
        setCanEdit,
        addQuotation,
        updateQuotationVersion,
        destroyQuotationVersion,
        submitQuotationVersion,
        cloneQuotationVersion,
        approveQuotationVersion
    }
}