import { useState, useCallback } from "react";
import axios from "axios";
import { ApiConfig } from "../config/ApiConfig";
import { ActionState } from "../components/Table/ReusableTable";

export interface CodeframeRow {
    id: number;
    respondent_id: string;
    response_text: string;
    code: string | null;
    coded_by: string | null;
    coded_at: string | null;
}

export function useCodeframe() {
    const [rows, setRows] = useState<CodeframeRow[]>([]);
    const [actionState, setActionState] = useState<ActionState>({
        type: "idle",
        loading: false,
        error: false,
        message: "",
    });

    const importData = useCallback(async (file: File) => {
        setActionState({ type: "import", loading: true, error: false, message: "" });

        const token = localStorage.getItem("authToken");
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post(ApiConfig.codeframe.import, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                },
            });

            setRows(response.data.data ?? []);
            setActionState({
                type: "import",
                loading: false,
                error: false,
                message: "Data imported successfully",
            });
        } catch (error: any) {
            setActionState({
                type: "import",
                loading: false,
                error: true,
                message: error.response?.data?.message ?? "Import failed. Please try again.",
            });
        }
    }, []);

    return { rows, actionState, importData };
}
