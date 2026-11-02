import React from "react";
import { Portal } from "@mui/material";
import { useProjectContext } from "../hook/useProjectContext";

// ProjectLayout renders the page header; a routed project page puts its primary actions there
// through this portal, so the actions keep the page's own state and handlers.
const ProjectPageActions: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { headerActionsEl } = useProjectContext();

    // Without a container MUI's Portal would mount into document.body.
    return headerActionsEl ? <Portal container={headerActionsEl}>{children}</Portal> : null;
};

export default ProjectPageActions;
