// Sidebar.tsx
import "./Sidebar.css";
import "../../assets/css/techcombank.css";
import React, { useEffect, useState } from 'react';
import { Divider, Drawer } from '@mui/material';
import { NavLink } from 'react-router-dom';
import GridViewIcon from "@mui/icons-material/GridView";
import Logo2 from '../../assets/img/Logo TCB-02.png'
import Logo4 from '../../assets/img/Logo TCB-04.png'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';

interface SideBarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

//const Sidebar: React.FC<SideBarProps> = ({isOpen, toggleSidebar}) => {

const Sidebar: React.FC<SideBarProps> = ({ isOpen, toggleSidebar }) => {
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  
  // const storedUser = localStorage.getItem('user');
  // const user = storedUser ? JSON.parse(storedUser) : null;
  
  // const visibilityConfig = VisibilityConfig[user.role as keyof typeof VisibilityConfig];

  useEffect(() => {
    
    const mediaQuery = window.matchMedia("(max-width: 600px)");
    setIsSmallScreen(mediaQuery.matches);

    const handleResize = () => {
      setIsSmallScreen(mediaQuery.matches);
    };
    mediaQuery.addEventListener("change", handleResize);
    return () => {
      mediaQuery.removeEventListener("change", handleResize);
    };
  }, []);

  const listSideBar = () => {
    return (
      <>
        <div className="tcb-logo-sidebar">
          {isOpen ? (<img src={Logo2} alt="" height={34}/>) : (<img src={Logo4} alt="" height={40}/>)}
        </div>
        <div className="menu">
          <div className="header-title-menu">
            <br/>
          </div>
          <ul className="menu-links">
            <li className="nav-link">
              <NavLink to="/techcombank/dashboard">
                <i className="icon">
                  <AssessmentOutlinedIcon style={{ fontSize: "18px" }} />
                </i>
                <span className="text nav-text">Dashboard</span>
              </NavLink>
            </li>
            <li className="nav-link">
              <NavLink to="/techcombank/products">
                <i className="icon">
                  <GridViewIcon style={{ fontSize: "18px" }} />
                </i>
                <span className="text nav-text">Products</span>
              </NavLink>
            </li>
            <li className="nav-link">
              <NavLink to="/techcombank/engagements">
                <i className="icon">
                  <GridViewIcon style={{ fontSize: "18px" }} />
                </i>
                <span className="text nav-text">Engagements</span>
              </NavLink>
            </li>
            <li className="nav-link">
              <NavLink to="/techcombank/about">
                <i className="icon">
                  <GridViewIcon style={{ fontSize: "18px" }} />
                </i>
                <span className="text nav-text">Market Trend</span>
              </NavLink>
            </li>
          </ul>
          <Divider style={{ margin: "18px 0" }} />
        </div>
      </>
    );
  };

  return (
    <>
      {isSmallScreen ? (
        <Drawer anchor="left" open={isOpen} onClose={toggleSidebar}>
          <div className="sidebar-drawer">{listSideBar()}</div>
        </Drawer>
      ) : (
        <div className={isOpen ? "sidebar" : "sidebar close"}>
          {listSideBar()}
        </div>
      )}
    </>
  );
};

export default Sidebar;
