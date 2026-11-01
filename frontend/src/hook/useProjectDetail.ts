import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ApiConfig } from "../config/ApiConfig";
import { ProjectData } from "../config/ProjectFieldsConfig";
import { ActionState } from "../components/Table/ReusableTable";

// Fetches a single project without useProjects(), which also loads the paginated project list on mount.
export const useProjectDetail = (projectId: number) => {
    const [project, setProject] = useState<ProjectData | null>(null);
    const [actionState, setActionState] = useState<ActionState>({
        type: 'idle',
        loading: false,
        error: false,
        message: ""
    });

    const fetchProject = useCallback(async () => {
        if (!projectId) return;

        setActionState({ type: 'fetch', loading: true, error: false, message: "" });

        try {
            const token = localStorage.getItem("authToken");
            const url = ApiConfig.project.showProject.replace('{projectId}', projectId.toString());

            const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            setProject(response.data.data);
            setActionState({ type: 'fetch', loading: false, error: false, message: "" });
        } catch (error) {
            let message = 'Failed to fetch project';
            if (axios.isAxiosError(error)) {
                message = error.response?.data?.message ?? error.message;
            }
            setActionState({ type: 'fetch', loading: false, error: true, message });
        }
    }, [projectId]);

    useEffect(() => {
        fetchProject();
    }, [fetchProject]);

    return { project, actionState, fetchProject };
};
