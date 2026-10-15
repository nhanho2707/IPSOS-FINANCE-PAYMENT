/* eslint-disable jsx-a11y/anchor-is-valid */
import "../Sidebar/Sidebar.css";
import { Divider, IconButton, Tooltip } from "@mui/material";
import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import logo from "../../assets/img/Ipsos logo.png";
import {
  HomeOutlined,
  RequestQuoteOutlined,
  AssignmentIndOutlined,
  GroupsOutlined,
  CardGiftcardOutlined,
  HeadsetMicOutlined,
  SettingsOutlined,
  ReceiptLongOutlined,
  InsightsOutlined,
  ChevronLeft,
  ChevronRight,
} from "@mui/icons-material";
import { useProjects } from "../../hook/useProjects";
import { ProjectData } from "../../config/ProjectFieldsConfig";

interface ProjectSidebarProps {
  projectId: number;
  isOpen: boolean;
  toggleSidebar: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  showIf?: (project: ProjectData | null) => boolean;
}

const buildNavItems = (projectId: number): NavItem[] => [
  {
    label: "Quotation",
    to: `/project-management/projects/${projectId}/quotation`,
    icon: RequestQuoteOutlined,
  },
  {
    label: "Assignment",
    to: `/project-management/projects/${projectId}/assignment`,
    icon: AssignmentIndOutlined,
  },
  {
    label: "Interviewers",
    to: `/project-management/projects/${projectId}/parttime-employees`,
    icon: GroupsOutlined,
    // showIf: (p) => p?.has_approved_quotation ?? false,
  },
  {
    label: "Gifts",
    to: `/project-management/projects/${projectId}/gifts`,
    icon: CardGiftcardOutlined,
    // showIf: (p) => p?.has_approved_quotation ?? false,
  },
  {
    label: "Transactions",
    to: `/project-management/projects/${projectId}/transactions`,
    icon: ReceiptLongOutlined,
  },
  {
    label: "Transaction Statistics",
    to: `/project-management/projects/${projectId}/transaction-statistics`,
    icon: InsightsOutlined,
  },
  {
    label: "CATI Settings",
    to: `/project-management/projects/${projectId}/cati-settings`,
    icon: HeadsetMicOutlined,
    // showIf: (p) => p?.project_types?.includes("CATI") ?? false,
  },
];

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ projectId, isOpen, toggleSidebar }) => {
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  const [projectSelected, setProjectSelected] = useState<ProjectData | null>(null);
  const { getProject } = useProjects();

  useEffect(() => {
    getProject(projectId)
      .then(setProjectSelected)
      .catch(console.error);
  }, [projectId]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    setIsSmallScreen(mediaQuery.matches);
    const handleResize = (e: MediaQueryListEvent) => setIsSmallScreen(e.matches);
    mediaQuery.addEventListener("change", handleResize);
    return () => mediaQuery.removeEventListener("change", handleResize);
  }, []);

  const handleClick = () => {
    if (isSmallScreen) toggleSidebar();
  };

  const navItems = buildNavItems(projectId).filter(
    (item) => !item.showIf || item.showIf(projectSelected)
  );

  const renderNavLink = (item: NavItem) => (
    <Tooltip key={item.to} title={item.label} placement="right" disableHoverListener={isOpen}>
      <li className="nav-link">
        <NavLink to={item.to} onClick={handleClick}>
          <span className="nav-icon-wrap">
            <item.icon style={{ fontSize: "20px" }} />
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
        <Tooltip title={isOpen ? "Thu nhỏ" : "Mở rộng"} placement="right">
          <IconButton
            onClick={toggleSidebar}
            size="small"
            sx={{
              bgcolor: "var(--body-color)",
              "&:hover": { bgcolor: "rgba(0, 157, 156, 0.12)" },
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
              <NavLink to="/project-management/projects" onClick={handleClick}>
                <span className="nav-icon-wrap">
                  <HomeOutlined style={{ fontSize: "20px" }} />
                </span>
                <span className="text nav-text">All Projects</span>
              </NavLink>
            </li>
          </Tooltip>

          <Divider style={{ margin: "8px 0" }} />

          {navItems.map(renderNavLink)}
        </ul>
      </div>

      <div className="sidebar-bottom">
        <Divider sx={{ mb: 1.5 }} />
        <ul className="menu-links" style={{ padding: 0 }}>
          <Tooltip title="Settings" placement="right" disableHoverListener={isOpen}>
            <li className="nav-link">
              <NavLink
                to={`/project-management/projects/${projectId}/settings`}
                onClick={handleClick}
              >
                <span className="nav-icon-wrap">
                  <SettingsOutlined style={{ fontSize: "20px" }} />
                </span>
                <span className="text nav-text">Settings</span>
              </NavLink>
            </li>
          </Tooltip>
        </ul>
      </div>
    </div>
  );
};

export default ProjectSidebar;
