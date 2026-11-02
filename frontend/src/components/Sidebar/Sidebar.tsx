/* eslint-disable jsx-a11y/anchor-is-valid */
import "../Sidebar/Sidebar.css";
import { Divider, IconButton, Tooltip, Typography } from "@mui/material";
import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import logo from "../../assets/img/Ipsos logo.png";
import { ChevronLeft, ChevronRight, FolderOpen, Logout, ManageAccounts, Payments } from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { hasRole, Role, ROLE_ACCESS } from "../../config/RoleConfig";
import { MOBILE_MEDIA_QUERY } from "./MobileNavToggle";

interface SideBarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  allowedRoles: readonly Role[] | null;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Projects",
    to: "/project-management/projects",
    icon: FolderOpen,
    allowedRoles: null,
  },
  {
    label: "Transactions",
    to: "/transaction-manager/transactions",
    icon: Payments,
    allowedRoles: ROLE_ACCESS.transactionsPage,
  },
  {
    label: "Accounts",
    to: "/account-management/accounts",
    icon: ManageAccounts,
    allowedRoles: ROLE_ACCESS.accountsPage,
  },
];

const Sidebar: React.FC<SideBarProps> = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    setIsSmallScreen(mediaQuery.matches);

    const handleResize = (e: MediaQueryListEvent) => {
      setIsSmallScreen(e.matches);
    };

    mediaQuery.addEventListener("change", handleResize);
    return () => {
      mediaQuery.removeEventListener("change", handleResize);
    };
  }, []);

  const visibleNavs = NAV_ITEMS.filter((nav) =>
    hasRole(user?.role, nav.allowedRoles)
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
          {visibleNavs.map((nav) => (
            <Tooltip
              key={nav.to}
              title={nav.label}
              placement="right"
              disableHoverListener={isOpen}
            >
              <li className="nav-link">
                <NavLink
                  to={nav.to}
                  onClick={() => {
                    if (isSmallScreen) toggleSidebar();
                  }}
                >
                  <span className="nav-icon-wrap">
                    <nav.icon style={{ fontSize: "20px" }} />
                  </span>
                  <span className="text nav-text">{nav.label}</span>
                </NavLink>
              </li>
            </Tooltip>
          ))}
        </ul>

        <Divider style={{ margin: "18px 0" }} />
      </div>

      <div className="sidebar-bottom">
        <Divider sx={{ mb: 1.5 }} />
        <div className="sidebar-user">
          {isOpen && (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontSize: "0.875rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "var(--text-primary-color)",
                mb: 0.75,
              }}
            >
              {user?.first_name} {user?.last_name}
            </Typography>
          )}
          <Tooltip title="Log out" placement="right" disableHoverListener={isOpen}>
            <button className="sidebar-logout-btn" onClick={logout}>
              <Logout sx={{ fontSize: "16px" }} />
              {isOpen && <span>Log out</span>}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
