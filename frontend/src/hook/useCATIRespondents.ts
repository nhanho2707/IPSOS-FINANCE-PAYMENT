import { useCallback, useEffect, useState } from "react";
import { CATIRespondentData } from "../config/MiniCATIFieldsConfig";
import axios from "axios";
import { ApiConfig } from "../config/ApiConfig";
import { ActionState } from "../components/Table/ReusableTable";

export type FilterOptions = {
    filter_1: string[],
    filter_2: string[],
    filter_3: string[],
    filter_4: string[]
}

export interface FilterData {
  filter_1: string,
  filter_2: string,
  filter_3: string,
  filter_4: string
}

export const useCATIRespondents = () => {

    const [ currentRespondent, setCurrentRespondent ] = useState<CATIRespondentData | null>(null);
    const [ catiRespondents, setCATIRespondents ] = useState<CATIRespondentData[]>([]);
    
    const [ actionState, setActionState ] = useState<ActionState>({
        type: 'idle',
        loading: false,
        error: false,
        message: ""
    });

    const [options, setOptions] = useState<FilterOptions>({
        filter_1: [],
        filter_2: [],
        filter_3: [],
        filter_4: []
    });
    
    const [ page, setPage ] = useState(0);
    const [ rowsPerPage, setRowsPerPage ] = useState(10);
    const [ searchTerm, setSearchTerm ] = useState("");
    
    const [ meta, setMeta ] = useState<any>(null);
    const [ total, setTotal ] = useState(0);

    const fetchCATISuppendedList = useCallback(async (options?: { silent?: boolean}) => {
        try
        {
            setActionState((prev) => ({
                ...prev,
                type: 'fetch',
                loading: true,
                ...(options?.silent ? {} : { message: "", error: false })
            }));
            
            const cati_token = localStorage.getItem('cati_token');

            console.log('Token: ', cati_token);

            const response = await axios.get(ApiConfig.minicati.getSuspendedList, {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cati_token}`
                },
                params: {
                    page: page + 1,
                    perPage: rowsPerPage,
                    searchTerm: searchTerm
                }
            })

            if(response.data.status_code === 401){
                alert("Phiên đăng nhập hết hạn");

                localStorage.removeItem('cati_token');
                window.location.href = "/mini-cati/login";
            }else if(response.data.status_code === 200){
                setCATIRespondents(response.data.data);
                setMeta(response.data.meta);
                setTotal(response.data.meta.total || 0);

                setActionState((prev) => ({
                    ...prev,
                    loading: false,
                    ...options?.silent ? {} : { message: response.data.message }
                }));
            } else {
                setActionState((prev) => ({
                    ...prev,
                    loading: false,
                    error: true,
                    ...options?.silent ? {} : { message: response.data.error }
                }));
            }
            
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
    }, [page, rowsPerPage, searchTerm]);  

    const fetchFilters = async() => {
        try
        {
            const cati_token = localStorage.getItem('cati_token');

            const response = await axios.get(ApiConfig.minicati.filters, {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cati_token}`
                },
            });

            if(response.data.status_code === 200){
                setOptions(response.data.data);
            } 
        } catch(error: any){
            console.log(error);
        }
    }

    const getCatiRespondent = async (filters: FilterData) => {
        try 
        {
            const cati_token = localStorage.getItem('cati_token');

            const response = await axios.post(ApiConfig.minicati.next, {
                ...filters
            }, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cati_token}`
                }
            });

            setCurrentRespondent(response.data.data);
        } catch (err: any) {
            console.error(err.response?.data);
        }
    };

    const updateStatus = async (id: number, status: string, comment: string) => {
        try
        {
            const cati_token = localStorage.getItem('cati_token');

            const response = await axios.post(ApiConfig.minicati.updateStatus, {
                id: id,
                status: status,
                comment: comment
            }, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cati_token}`
                }
            });
        } catch(error: any){
            console.error(error.response?.data);
        }
    }
    
    useEffect(() => {
        fetchFilters();
    }, []);

    useEffect(() => {
        fetchCATISuppendedList({ silent: true });
    }, [page, rowsPerPage, searchTerm])

    return {
        options,
        currentRespondent,
        catiRespondents,
        actionState,
        meta,
        total,
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
        searchTerm,
        setSearchTerm,
        setCurrentRespondent,

        fetchCATISuppendedList,
        getCatiRespondent,
        updateStatus
    }
};