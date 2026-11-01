import { useOutletContext } from "react-router-dom";
import { ProjectData } from "../config/ProjectFieldsConfig";

export interface ProjectOutletContext {
    projectId: number;
    project: ProjectData | null;
    refreshProject: () => Promise<void>;
}

export const useProjectContext = () => useOutletContext<ProjectOutletContext>();
