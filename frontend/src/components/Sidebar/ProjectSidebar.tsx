/* eslint-disable jsx-a11y/anchor-is-valid */
import "../Sidebar/Sidebar.css";
import { Divider } from "@mui/material";
import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import logo from "../../assets/img/Ipsos logo.png";
import { LibraryBooks } from "@mui/icons-material";
import { useVisibility } from "../../hook/useVisibility";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import { useProjects } from "../../hook/useProjects";
import { ProjectData } from "../../config/ProjectFieldsConfig";

interface ProjectSidebarProps {
    projectId: number,
    isOpen: boolean;
    toggleSidebar: () => void;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ projectId, isOpen, toggleSidebar }) => {
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);

  const { getProject } = useProjects();

  const [ projectSelected, setProjectSelected ] = useState<ProjectData | null>(null);

  useEffect(() => {
    async function fetchProject(){
        try{
            const p = await getProject(projectId);
            setProjectSelected(p);
        }catch(error){
            console.log(error);
        }
    }

    fetchProject();
  }, [projectId]);

  const { canView } = useVisibility();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)"); // mobile < 768px
    setIsSmallScreen(mediaQuery.matches);

    const handleResize = (e: MediaQueryListEvent) => {
      setIsSmallScreen(e.matches);
    };

    mediaQuery.addEventListener("change", handleResize);
    return () => {
      mediaQuery.removeEventListener("change", handleResize);
    };
  }, []);

  return (
    <div className={`sidebar ${isOpen ? "open" : "close"}`}>
      <div className="logo-sidebar">
        <img src={logo} alt="Logo" />
      </div>

      <div className="menu">
        <div className="header-title-menu">
          <span>Project management</span>
        </div>

        <ul className="menu-links">
            <li className="home-link">
                <NavLink
                    to={`/project-management/projects`}
                    onClick={() => {
                    if (isSmallScreen) toggleSidebar(); // chỉ đóng nếu là mobile
                    }}
                >
                    <i className="icon">
                        <HomeOutlinedIcon style={{ fontSize: "18px" }} />
                    </i>
                    <span className="text nav-text">All Projects</span>
                </NavLink>
            </li>
            <Divider style={{ margin: "12px 0" }} />
            <li className="nav-link">
              <NavLink
                to={`/project-management/projects/${projectId}/quotation`}
                onClick={() => {
                  if (isSmallScreen) toggleSidebar(); // chỉ đóng nếu là mobile
                }}
              >
                <i className="icon">
                  <LibraryBooks style={{ fontSize: "18px" }} />
                </i>
                <span className="text nav-text">Quotation</span>
              </NavLink>
            </li>
            <li className="nav-link">
                <NavLink
                    to={`/project-management/projects/${projectId}/parttime-employees`}
                    onClick={() => {
                    if (isSmallScreen) toggleSidebar(); // chỉ đóng nếu là mobile
                    }}
                >
                    <i className="icon">
                    <LibraryBooks style={{ fontSize: "18px" }} />
                    </i>
                    <span className="text nav-text">Interviewers</span>
                </NavLink>
            </li>
            <li className="nav-link">
              <NavLink
                  to={`/project-management/projects/${projectId}/gifts`}
                  onClick={() => {
                  if (isSmallScreen) toggleSidebar(); // chỉ đóng nếu là mobile
                  }}
              >
                  <i className="icon">
                  <LibraryBooks style={{ fontSize: "18px" }} />
                  </i>
                  <span className="text nav-text">Gifts</span>
              </NavLink>
            </li>
            {projectSelected?.project_types.includes('CATI') && (
              <li className="nav-link">
                <NavLink
                    to={`/project-management/projects/${projectId}/cati-settings`}
                    onClick={() => {
                    if (isSmallScreen) toggleSidebar(); // chỉ đóng nếu là mobile
                    }}
                >
                    <i className="icon">
                    <LibraryBooks style={{ fontSize: "18px" }} />
                    </i>
                    <span className="text nav-text">CATI Settings</span>
                </NavLink>
              </li>
            )}
        </ul>
        <Divider style={{ margin: "18px 0" }} />
        <ul className="menu-links">
          <li className="nav-link">
            <NavLink
                to={`/project-management/projects/${projectId}/settings`}
                onClick={() => {
                if (isSmallScreen) toggleSidebar(); // chỉ đóng nếu là mobile
                }}
            >
                <i className="icon">
                <LibraryBooks style={{ fontSize: "18px" }} />
                </i>
                <span className="text nav-text">Settings</span>
            </NavLink>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ProjectSidebar;
