import React from "react";
import { Outlet } from "react-router-dom";
import AppShell, { SidebarSearchButton } from "../components/Shell/AppShell";
import SidebarNav, { SidebarNavGroup } from "../components/Shell/SidebarNav";
import { getAppNavGroupsForRole } from "../config/AppNavConfig";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { tKey } from "../i18n/i18n";

const DefaultLayout: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const groups: SidebarNavGroup[] = getAppNavGroupsForRole(user?.role).map((group) => ({
    key: group.label,
    label: tKey(group.label),
    items: group.items.map((item) => ({ key: item.to, label: tKey(item.label), to: item.to, icon: item.icon })),
  }));

  return (
    <AppShell
      sidebar={({ collapsed, openPalette }) => (
        <>
          <SidebarSearchButton collapsed={collapsed} onClick={() => openPalette("search")} />
          <SidebarNav ariaLabel={t("nav.shell.main")} groups={groups} collapsed={collapsed} />
        </>
      )}
    >
      <Outlet />
    </AppShell>
  );
};

export default DefaultLayout;
