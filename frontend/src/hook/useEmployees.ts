import { useCallback, useEffect, useState } from "react";
import { EmployeeData } from "../config/EmployeeFieldsConfig";
import axios from "axios";
import { ApiConfig } from "../config/ApiConfig";
import i18n from "../i18n/i18n";

export function useEmployees(projectId: number) {
    const [ employees, setEmployees ] = useState<EmployeeData[]>([]);
    const [ loading, setLoading ] = useState(false);
    const [ error, setError ] = useState(false);
    const [ message, setMessage ] = useState("");

    const [ page, setPage ] = useState(0);
    const [ rowsPerPage, setRowsPerPage ] = useState(10);
    const [ searchTerm, setSearchTerm ] = useState("");

    const [ meta, setMeta ] = useState<any>(null);
    const [ total, setTotal ] = useState(0);

    const fetchEmployees = useCallback(async (page = 0, rowsPerPage = 0, searchTerm = '') => {
        try{
            setLoading(true);
            setError(false);
            setMessage("");

            const token = localStorage.getItem('authToken');

            const url = `${ApiConfig.employee.viewEmployees.replace("{projectId}", projectId.toString())}`;

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

            setEmployees(response.data.data);
            setMeta(response.data.meta);
            setTotal(response.data.meta.total);
        } catch(error: any){
            setError(true);
            setMessage(error.message || i18n.t('interviewers.errors.load'));
        } finally{
            setLoading(false);
        }

    }, [projectId, page, rowsPerPage, searchTerm]);

    const addEmployees = useCallback(async (id: number, employee_ids: string) => {
        
        const token = localStorage.getItem("authToken");

        const url = `${ApiConfig.project.addEmployees.replace("{projectId}", id.toString())}`;

        const response = await axios.post(url, {
            employee_ids
        }, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });
        
        await fetchEmployees(page, rowsPerPage, searchTerm);
        
        setError(response.data.invalidEmployeeIds.length > 0 || response.data.existedEmployeeIds.length > 0);
        setMessage(response.data.message);

    }, [fetchEmployees, page, rowsPerPage, searchTerm]);
    
    const removeEmployee = useCallback(async (project_id: number, employee_id: number) => {
        const token = localStorage.getItem("authToken");

        const url = `${ApiConfig.project.removeEmployee.replace("{projectId}", project_id.toString()).replace("{employeeId}", employee_id.toString())}`;

        const response = await axios.delete(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });

        await fetchEmployees(page, rowsPerPage, searchTerm);

        setError(!response.data.success);
        setMessage(response.data.message);

    }, [fetchEmployees, page, rowsPerPage, searchTerm]);

    useEffect(() => {
        fetchEmployees(page, rowsPerPage, searchTerm)
    }, [projectId, page, rowsPerPage, searchTerm]);

    return {
        employees,
        meta,
        total,
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
        searchTerm,
        setSearchTerm,
        loading,
        error,
        message,
        fetchEmployees,
        addEmployees,
        removeEmployee
    }
}