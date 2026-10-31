import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { ApiConfig } from "../config/ApiConfig";
import { CloneProjectPayload, ProjectData } from "../config/ProjectFieldsConfig";
import dayjs, { Dayjs } from "dayjs";
import { ActionState } from "../components/Table/ReusableTable";

export function useProjects() {

    const [ projects, setProjects ] = useState<ProjectData[]>([]);
    
    const [ actionState, setActionState ] = useState<ActionState>({
        type: 'idle',
        loading: false,
        error: false,
        message: ""
    });

    const [ page, setPage ] = useState(0);
    const [ rowsPerPage, setRowsPerPage ] = useState(10);
    const [ searchTerm, setSearchTerm ] = useState("");

    const [ searchFromDate, setSearchFromDate ] = useState<Dayjs>(dayjs().startOf("year"));
    const [ searchToDate, setSearchToDate ] = useState<Dayjs>(dayjs().endOf("year"));

    const [ meta, setMeta ] = useState<any>(null);
    const [ total, setTotal ] = useState(0); //Tổng số projects từ backend
    const [ showDisabled, setShowDisabled ] = useState(false);

    const fetchProjects = useCallback(async (options?: {silent?: boolean}) => {
        try{
            setActionState((prev) => ({
                ...prev,
                type: 'fetch',
                loading: true,
                ...(options?.silent ? {} : { message: "", error: false })
            }));

            const token = localStorage.getItem("authToken");

            const response = await axios.get(ApiConfig.project.viewProjects, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...(!showDisabled && { 'Show-Only-Enabled': '1' }),
                },
                params: {
                    page: page + 1,        // Laravel dùng page = 1,2,3...
                    perPage: rowsPerPage,
                    searchTerm: searchTerm,
                    searchFromDate: searchFromDate.format("YYYY-MM-DD"),
                    searchToDate: searchToDate.format("YYYY-MM-DD")
                },
            });

            setProjects(response.data.data);
            setMeta(response.data.meta);
            setTotal(response.data.meta.total);

            setActionState((prev) => ({
                ...prev,
                loading: false,
                ...options?.silent ? {} : { message: response.data.message }
            }));
        }catch(error: any){
            let message = 'Failed to fetch Projects';
            
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
        }; 

    }, [page, rowsPerPage, searchTerm, searchFromDate, searchToDate, showDisabled]);

    const addProject = useCallback(async (payload: Partial<ProjectData>) => {
        setActionState({ type: 'add', loading: true, error: false, message: '' });
        try {
            const token = localStorage.getItem("authToken");

            const response = await axios.post(ApiConfig.project.addProject, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            setActionState({ type: 'add', loading: false, error: false, message: '' });
            await fetchProjects();
            return response.data.data;
        } catch (error) {
            let message = 'Failed to create project';
            if (axios.isAxiosError(error)) {
                message = error.response?.data.message ?? error.message;
            }
            setActionState({ type: 'add', loading: false, error: true, message });
            throw error;
        }
    }, [fetchProjects]);
    
    const cloneProject = useCallback(async (id: number, payload: CloneProjectPayload): Promise<ProjectData> => {
        setActionState({ type: 'add', loading: true, error: false, message: '' });
        try {
            const token = localStorage.getItem("authToken");

            const url = ApiConfig.project.cloneProject.replace('{projectId}', id.toString());

            const response = await axios.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            setActionState({ type: 'add', loading: false, error: false, message: response.data.message });
            await fetchProjects({ silent: true });
            return response.data.data;
        } catch (error) {
            let message = 'Failed to clone project';
            if (axios.isAxiosError(error)) {
                message = error.response?.data.message ?? error.message;
            }
            setActionState({ type: 'add', loading: false, error: true, message });
            throw error;
        }
    }, [fetchProjects]);

    const updateProjectStatus = useCallback(async ( id: number, status: string) => {

        const token = localStorage.getItem("authToken");

        const url = ApiConfig.project.updateStatusOfProject.replace('{projectId}', id.toString());

        const response = await axios.put(url, { status: status }, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });

        const project = response.data.data;

        setProjects(prev => prev.map(p => p.id == project.id ? { ...p, status} : p));

        return response.data.data;

    }, [fetchProjects]);

    const updateDisabled = useCallback(async (id: number, disabled: boolean) => {
        const token = localStorage.getItem("authToken");
        const url = ApiConfig.project.updateDisabledProject.replace('{projectId}', id.toString());

        const response = await axios.put(url, { disabled }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });

        setProjects(prev => prev.filter(p => p.id !== id));

        return response.data;
    }, []);

    const assignUsers = async(id: number, user_ids: number[]) => {
        
        try
        {
            setActionState({
                type: 'update',
                loading: true,
                error: false,
                message: ""
            });

            const token = localStorage.getItem("authToken");

            const url = ApiConfig.project.assignUsers.replace('{projectId}', id.toString());
            
            const response = await axios.put(url, { user_ids: user_ids }, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });
            
            if(response.data.status_code === 400){
                setActionState({
                    type: 'update',
                    loading: false,
                    error: true,
                    message: response.data.error
                });
            } else {
                const project = response.data.data;

                setProjects(prev => prev.map(p => p.id === id ? project : p));

                setActionState({
                    type: 'update',
                    loading: false,
                    error: false,
                    message: response.data.message
                });
            }
            
            return response.data;
        } catch(error: any){
            let message = 'Failed to assign Permissions';
            
            if(axios.isAxiosError(error)){
                message = error.response?.data.message || error.response?.data.error || error.message
            } else {
                message = error.response?.error
            }
            
            setActionState((prev) => ({
                ...prev,
                loading: false,
                error: true
            }));

            throw error;
        };
    }

    const getProject = useCallback(async (id: number) => {
        
        const token = localStorage.getItem("authToken");
        
        const url = `${ApiConfig.project.viewProjects + "/" + id + '/show'}`;

        const response = await axios.get(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        return response.data.data;

    }, []);
    
    useEffect(() => {
        fetchProjects({silent: true});
    }, [page, rowsPerPage, searchTerm, searchFromDate, searchToDate, fetchProjects]);

    return {
        projects,
        actionState,
        meta,
        total,
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
        searchTerm,
        setSearchTerm,
        searchFromDate,
        setSearchFromDate,
        searchToDate,
        setSearchToDate,
        fetchProjects,
        getProject,
        addProject,
        cloneProject,
        updateProjectStatus,
        updateDisabled,
        assignUsers,
        showDisabled,
        setShowDisabled,
    };
}