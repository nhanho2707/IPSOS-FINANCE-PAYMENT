import React from "react";
import {
  AccountBalanceWalletOutlined,
  FolderOutlined,
  ManageAccountsOutlined,
} from "@mui/icons-material";
import { hasRole, Role, ROLE_ACCESS } from "./RoleConfig";

export const PROJECTS_PATH = "/project-management/projects";

export interface AppNavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  // null: every signed-in user.
  allowedRoles: readonly Role[] | null;
  // Extra words the command palette matches, e.g. the old page name.
  keywords?: string[];
}

export interface AppNavGroup {
  label: string;
  items: AppNavItem[];
}

export const APP_NAV_GROUPS: AppNavGroup[] = [
  {
    label: "Work",
    items: [
      { label: "Projects", to: PROJECTS_PATH, icon: FolderOutlined, allowedRoles: null },
      {
        label: "Finance",
        to: "/transaction-manager/transactions",
        icon: AccountBalanceWalletOutlined,
        allowedRoles: ROLE_ACCESS.transactionsPage,
        keywords: ["transactions", "balance", "deposit", "export", "vinnet", "gotit"],
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        label: "Accounts",
        to: "/account-management/accounts",
        icon: ManageAccountsOutlined,
        allowedRoles: ROLE_ACCESS.accountsPage,
        keywords: ["users", "roles", "password"],
      },
    ],
  },
];

export const getAppNavGroupsForRole = (role: string | null | undefined): AppNavGroup[] =>
  APP_NAV_GROUPS
    .map((group) => ({ ...group, items: group.items.filter((item) => hasRole(role, item.allowedRoles)) }))
    .filter((group) => group.items.length > 0);
