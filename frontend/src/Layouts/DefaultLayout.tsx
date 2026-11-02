import { useState } from "react";
import Sidebar from "../components/Sidebar/Sidebar";
import MobileNavToggle, { isMobileViewport } from "../components/Sidebar/MobileNavToggle";
import { Outlet } from "react-router-dom";

const DefaultLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => !isMobileViewport());

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <>
      <div className="wrapper">
        <MobileNavToggle open={isSidebarOpen} onOpen={toggleSidebar} />
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <div className="content">
          <div className="content-detail">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
};

export default DefaultLayout;
