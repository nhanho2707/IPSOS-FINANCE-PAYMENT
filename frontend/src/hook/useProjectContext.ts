import { useOutletContext } from "react-router-dom";
import { ProjectData } from "../config/ProjectFieldsConfig";

export interface ProjectOutletContext {
    projectId: number;
    project: ProjectData | null;
    refreshProject: () => Promise<void>;
    // The project header's action area; pages fill it through <ProjectPageActions>.
    headerActionsEl: HTMLElement | null;
}

export const useProjectContext = () => useOutletContext<ProjectOutletContext>();
