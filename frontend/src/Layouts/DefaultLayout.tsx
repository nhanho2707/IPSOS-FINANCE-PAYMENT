import React from "react";
import { Outlet } from "react-router-dom";
import AppShell, { SidebarSearchButton } from "../components/Shell/AppShell";
import SidebarNav, { SidebarNavGroup } from "../components/Shell/SidebarNav";
import { getAppNavGroupsForRole } from "../config/AppNavConfig";
import { useAuth } from "../contexts/AuthContext";

const DefaultLayout: React.FC = () => {
  const { user } = useAuth();

  const groups: SidebarNavGroup[] = getAppNavGroupsForRole(user?.role).map((group) => ({
    key: group.label,
    label: group.label,
    items: group.items.map((item) => ({ key: item.to, label: item.label, to: item.to, icon: item.icon })),
  }));

  return (
    <AppShell
      sidebar={({ collapsed, openPalette }) => (
        <>
          <SidebarSearchButton collapsed={collapsed} onClick={() => openPalette("search")} />
          <SidebarNav ariaLabel="Main" groups={groups} collapsed={collapsed} />
        </>
      )}
    >
      <Outlet />
    </AppShell>
  );
};

export default DefaultLayout;
