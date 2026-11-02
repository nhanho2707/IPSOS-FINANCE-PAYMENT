import { useCallback, useEffect, useState } from "react";
import { OfflineGiftBulkSendResult, OfflineGiftSendResult, OfflineProjectRespondentData, OfflineProjectRespondentImportPayload } from "../config/OfflineProjectRespondentFieldsConfig";
import { ApiConfig } from "../config/ApiConfig";
import axios from "axios";
import { getServiceCode } from "../utils/VinnetFunctions";

interface ImportErrorDetail {
    row: number,
    type: string,
    respondent_id: string
}

interface ImportErrorResponse {
    message?: string,
    error_count?: number,
    // Row checks return a list; Laravel's FormRequest validation returns field-keyed messages.
    errors?: ImportErrorDetail[] | Record<string, string[]>
}

const MAX_ERROR_ROWS_SHOWN = 20;

const formatRowList = (rows: number[]) => {
    const sorted = Array.from(new Set(rows)).sort((a, b) => a - b);
    const shown = sorted.slice(0, MAX_ERROR_ROWS_SHOWN).join(", ");
    return sorted.length > MAX_ERROR_ROWS_SHOWN ? `${shown}, …` : shown;
};

const formatImportErrors = (data: ImportErrorResponse | undefined): string => {
    const errors = data?.errors;

    if (!errors) {
        return data?.message ?? "Import failed.";
    }

    const grouped: Record<string, number[]> = {};

    if (Array.isArray(errors)) {
        errors.forEach(e => {
            (grouped[e.type] ??= []).push(e.row);
        });
    } else {
        Object.entries(errors).forEach(([key, messages]) => {
            const match = key.match(/^project_respondents\.(\d+)\.(\w+)$/);

            if (!match) {
                grouped[messages[0] ?? key] ??= [];
                return;
            }

            // Payload index 0 is spreadsheet row 2 (row 1 is the header).
            const label = `${match[2].toUpperCase()}_INVALID`;
            (grouped[label] ??= []).push(Number(match[1]) + 2);
        });
    }

    const invalidRows = new Set(Object.values(grouped).flat()).size;

    const lines = Object.entries(grouped).map(([type, rows]) =>
        rows.length ? `❌ ${type}: ${rows.length} row(s) (${formatRowList(rows)})` : `❌ ${type}`
    );

    return [`There are ${invalidRows} invalid rows.`, "", ...lines].join("\n");
};

// 900: gift sent, 996: test environment (marked as received without calling the provider).
const GIFT_SUCCESS_STATUS_CODES = [900, 996];

const PENDING_FETCH_PAGE_SIZE = 200;

// Failing respondents are moved out of "pending" and cannot be resent from the page, so a
// systemic failure (e.g. provider balance exhausted) must stop the run instead of burning the list.
export const MAX_CONSECUTIVE_GIFT_FAILURES = 5;

export function useOfflineProjectRespondents(projectId: number) {
    
    const [ offineProjectRespondents, setOfflineProjectRespondents ] = useState<OfflineProjectRespondentData[]>([]);
    const [ loading, setLoading ] = useState(false);
    const [ error, setError ] = useState(false);
    const [ message, setMessage ] = useState("");

    const [ page, setPage ] = useState(0);
    const [ rowsPerPage, setRowsPerPage ] = useState(10);
    const [ searchTerm, setSearchTerm ] = useState("");

    const [ meta, setMeta ] = useState<any>(null);
    const [ total, setTotal ] = useState(0);

    const fetchProjectRespondents = useCallback(async(page = 0, rowsPerPage = 0, searchTerm = "") => {
        try
        {
            setLoading(true);
            setError(false);
            setMessage("");

            const token = localStorage.getItem('authToken');
            
            const url = `${ApiConfig.project.viewOfflineProjectRespondents.replace("{projectId}", projectId.toString())}`;

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

            setOfflineProjectRespondents(response.data.data);
            setMeta(response.data.meta);
            setTotal(response.data.meta.total);

        }catch(error: any){
            setError(true);
            setMessage(error.message || 'Failed to fetch Transactions');
        }finally{
            setLoading(false);
        }
    }, [projectId, page, rowsPerPage, searchTerm]);

    const importOfflineProjectRespondents = useCallback(async(payload: OfflineProjectRespondentImportPayload[]) => {
        try
        {
            setLoading(true);
            setError(false);
            setMessage("");

            const token = localStorage.getItem('authToken');

            const url = `${ApiConfig.project.addOfflineProjectRespondents.replace("{projectId}", projectId.toString())}`;

            const response = await axios.post(url, {
                project_respondents: payload
            }, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            await fetchProjectRespondents(page, rowsPerPage, searchTerm);

            setMessage(`Imported ${response.data.imported_count} respondents.`);

        } catch(error: any){
            setError(true);

            if (axios.isAxiosError(error)) {
                setMessage(error.response?.status === 422
                    ? formatImportErrors(error.response.data)
                    : (error.response?.data?.message ?? error.message));
            } else {
                setMessage(error.message);
            }

            throw error;
        } finally {
            setLoading(false);
        }
    }, [fetchProjectRespondents, page, rowsPerPage, searchTerm]);

    const removeProjectRespondent = useCallback(async (project_id: number, data: OfflineProjectRespondentData) => {
        const token = localStorage.getItem("authToken");

        const url = `${ApiConfig.project.removeProjectRespondent.replace("{projectId}", project_id.toString()).replace("{projectRespondentId}", data.id.toString())}`;

        const response = await axios.delete(url, {
            data: {
                shell_chainid: data.shell_chainid,
                respondent_id: data.respondent_id
            }, 
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        await fetchProjectRespondents(page, rowsPerPage, searchTerm);

        setError(!response.data.success);
        setMessage(response.data.message);

    }, [fetchProjectRespondents, page, rowsPerPage, searchTerm]);
    
    const sendOfflineTransaction = useCallback(async (data: OfflineProjectRespondentData): Promise<OfflineGiftSendResult> => {
        const token = localStorage.getItem("authToken");

        const url = data.channel === "vinnet" ? `${ApiConfig.vinnet.performTransaction}` : `${ApiConfig.gotit.performTransaction}`;

        try
        {
            const response = await axios.post(url, {
                    token: data.token,
                    service_type: "voucher",
                    service_code: getServiceCode(data.phone_number),
                    phone_number: data.phone_number,
                    provider: data.channel,
                    delivery_method: "sms",
                    mode: "offline"
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

            // GotIt reports some failures with HTTP 200, so the business status code decides.
            return {
                row: data,
                success: GIFT_SUCCESS_STATUS_CODES.includes(Number(response.data.status_code)),
                message: response.data.message ?? ""
            };
        } catch(error){
            return {
                row: data,
                success: false,
                message: axios.isAxiosError(error)
                    ? (error.response?.data?.message ?? error.message)
                    : String(error)
            };
        }
    }, []);

    const offlineTransactionSending = useCallback(async (project_id: number, data: OfflineProjectRespondentData) => {
        setLoading(false);
        setError(false);
        setMessage("");

        const result = await sendOfflineTransaction(data);

        await fetchProjectRespondents(page, rowsPerPage, searchTerm);

        setError(!result.success);
        setMessage(result.message);
    }, [sendOfflineTransaction, fetchProjectRespondents, page, rowsPerPage, searchTerm]);

    const fetchAllPendingProjectRespondents = useCallback(async (): Promise<OfflineProjectRespondentData[]> => {
        const token = localStorage.getItem('authToken');

        const url = `${ApiConfig.project.viewOfflineProjectRespondents.replace("{projectId}", projectId.toString())}`;

        const rows: OfflineProjectRespondentData[] = [];

        let currentPage = 1;
        let lastPage = 1;

        do {
            const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: {
                    page: currentPage,
                    perPage: PENDING_FETCH_PAGE_SIZE,
                    status: 'pending'
                }
            });

            rows.push(...response.data.data);
            lastPage = response.data.meta.last_page;
            currentPage++;
        } while (currentPage <= lastPage);

        return rows;
    }, [projectId]);

    // Gifts are sent one at a time: each call buys real vouchers, and the backend locks per
    // respondent, so parallel calls would only add load on the providers.
    const bulkOfflineTransactionSending = useCallback(async (
        rows: OfflineProjectRespondentData[],
        onProgress: (done: number, result: OfflineGiftSendResult) => void,
        shouldStop: () => boolean
    ): Promise<OfflineGiftBulkSendResult> => {
        const results: OfflineGiftSendResult[] = [];
        let consecutiveFailures = 0;
        let stoppedOnFailures = false;

        setError(false);
        setMessage("");

        for (const row of rows) {
            if (shouldStop()) break;

            const result = await sendOfflineTransaction(row);

            results.push(result);
            onProgress(results.length, result);

            consecutiveFailures = result.success ? 0 : consecutiveFailures + 1;

            if (consecutiveFailures >= MAX_CONSECUTIVE_GIFT_FAILURES) {
                stoppedOnFailures = true;
                break;
            }
        }

        await fetchProjectRespondents(page, rowsPerPage, searchTerm);

        // The caller reports the outcome (Gifts shows a result banner with every failure).
        return { results, stoppedOnFailures };
    }, [sendOfflineTransaction, fetchProjectRespondents, page, rowsPerPage, searchTerm]);

    useEffect(() => {
        fetchProjectRespondents(page, rowsPerPage, searchTerm);
    }, [projectId, page, rowsPerPage, searchTerm])

    return {
        offineProjectRespondents,
        loading,
        error,
        message,
        offlineTransactionSending,
        bulkOfflineTransactionSending,
        fetchAllPendingProjectRespondents,
        importOfflineProjectRespondents,
        removeProjectRespondent,
        page,
        rowsPerPage,
        searchTerm,
        total,
        setSearchTerm,
        setPage,
        setRowsPerPage
    };
}