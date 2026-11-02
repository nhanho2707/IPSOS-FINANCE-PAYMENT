/* eslint-disable jsx-a11y/anchor-is-valid */
import "../Sidebar/Sidebar.css";
import { Divider, IconButton, Tooltip } from "@mui/material";
import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import logo from "../../assets/img/Ipsos logo.png";
import {
  HomeOutlined,
  ChevronLeft,
  ChevronRight,
} from "@mui/icons-material";
import { ProjectData } from "../../config/ProjectFieldsConfig";
import { getProjectNavItemsForRole, ProjectNavItem, projectNavPath } from "../../config/ProjectNavConfig";
import { useAuth } from "../../contexts/AuthContext";
import { MOBILE_MEDIA_QUERY } from "./MobileNavToggle";
import { BRAND, NEUTRAL } from "../../config/ThemeConfig";

interface ProjectSidebarProps {
  projectId: number;
  project: ProjectData | null;
  isOpen: boolean;
  toggleSidebar: () => void;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ projectId, project, isOpen, toggleSidebar }) => {
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  const { user } = useAuth();

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    setIsSmallScreen(mediaQuery.matches);
    const handleResize = (e: MediaQueryListEvent) => setIsSmallScreen(e.matches);
    mediaQuery.addEventListener("change", handleResize);
    return () => mediaQuery.removeEventListener("change", handleResize);
  }, []);

  const handleClick = () => {
    if (isSmallScreen) toggleSidebar();
  };

  const visibleItems = getProjectNavItemsForRole(user?.role).filter(
    (item) => !item.showIf || item.showIf(project)
  );
  const mainItems = visibleItems.filter((item) => item.placement === "main");
  const bottomItems = visibleItems.filter((item) => item.placement === "bottom");

  const renderNavLink = (item: ProjectNavItem) => (
    <Tooltip key={item.path} title={item.label} placement="right" disableHoverListener={isOpen}>
      <li className="nav-link">
        <NavLink to={projectNavPath(projectId, item.path)} onClick={handleClick}>
          <span className="nav-icon-wrap">
            <item.icon sx={{ fontSize: 20 }} />
          </span>
          <span className="text nav-text">{item.label}</span>
        </NavLink>
      </li>
    </Tooltip>
  );

  return (
    <div className={`sidebar ${isOpen ? "open" : "close"}`}>
      <div className="sidebar-header">
        <img src={logo} alt="Logo" className="sidebar-logo" />
        <Tooltip title={isOpen ? "Collapse" : "Expand"} placement="right">
          <IconButton
            onClick={toggleSidebar}
            size="small"
            sx={{
              bgcolor: NEUTRAL[100],
              "&:hover": { bgcolor: BRAND.soft },
              flexShrink: 0,
            }}
          >
            {isOpen ? <ChevronLeft fontSize="small" /> : <ChevronRight fontSize="small" />}
          </IconButton>
        </Tooltip>
      </div>

      <div className="menu">
        <div className="header-title-menu">
          <span>Project management</span>
        </div>

        <ul className="menu-links">
          <Tooltip title="All Projects" placement="right" disableHoverListener={isOpen}>
            <li className="nav-link">
              <NavLink to="/project-management/projects" end onClick={handleClick}>
                <span className="nav-icon-wrap">
                  <HomeOutlined sx={{ fontSize: 20 }} />
                </span>
                <span className="text nav-text">All Projects</span>
              </NavLink>
            </li>
          </Tooltip>

          <Divider style={{ margin: "8px 0" }} />

          {mainItems.map(renderNavLink)}
        </ul>
      </div>

      <div className="sidebar-bottom">
        <Divider sx={{ mb: 1.5 }} />
        <ul className="menu-links" style={{ padding: 0 }}>
          {bottomItems.map(renderNavLink)}
        </ul>
      </div>
    </div>
  );
};

export default ProjectSidebar;
