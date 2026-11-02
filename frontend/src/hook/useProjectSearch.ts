import { useEffect, useState } from "react";
import axios from "axios";
import { ApiConfig } from "../config/ApiConfig";
import { ProjectData } from "../config/ProjectFieldsConfig";
import { ActionState } from "../components/Table/ReusableTable";

const SEARCH_DEBOUNCE_MS = 200;
const RESULT_LIMIT = 8;

// Quick lookup for the command palette. Without a search term the backend's own order applies
// (projects in field first), which makes a useful starting list.
export function useProjectSearch(searchTerm: string, enabled: boolean) {
    const [ projects, setProjects ] = useState<ProjectData[]>([]);
    const [ actionState, setActionState ] = useState<ActionState>({
        type: 'idle',
        loading: false,
        error: false,
        message: ""
    });

    useEffect(() => {
        if (!enabled) return;

        // Typing fires a request per pause; aborting the previous one keeps a slow early response
        // from replacing the results of a later query.
        const controller = new AbortController();

        const timer = window.setTimeout(async () => {
            setActionState({ type: 'fetch', loading: true, error: false, message: "" });

            try {
                const token = localStorage.getItem("authToken");

                const response = await axios.get(ApiConfig.project.viewProjects, {
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Show-Only-Enabled': '1',
                    },
                    params: {
                        page: 1,
                        perPage: RESULT_LIMIT,
                        searchTerm: searchTerm.trim(),
                    },
                });

                setProjects(response.data.data ?? []);
                setActionState({ type: 'fetch', loading: false, error: false, message: "" });
            } catch (error) {
                if (axios.isCancel(error)) return;

                setActionState({ type: 'fetch', loading: false, error: true, message: "Could not load projects." });
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [searchTerm, enabled]);

    return { projects, actionState };
}
