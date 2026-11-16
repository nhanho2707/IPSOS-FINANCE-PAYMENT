import React from "react";
import {
  AccountBalanceWalletOutlined,
  FolderOutlined,
  ManageAccountsOutlined,
} from "@mui/icons-material";
import { hasRole, Role, ROLE_ACCESS } from "./RoleConfig";
import type { TranslationKey } from "../i18n/i18n";

export const PROJECTS_PATH = "/project-management/projects";

export interface AppNavItem {
  label: TranslationKey;
  to: string;
  icon: React.ElementType;
  // null: every signed-in user.
  allowedRoles: readonly Role[] | null;
  // Extra words the command palette matches in any language, e.g. the old page name.
  keywords?: string[];
}

export interface AppNavGroup {
  label: TranslationKey;
  items: AppNavItem[];
}

export const APP_NAV_GROUPS: AppNavGroup[] = [
  {
    label: "nav.groups.work",
    items: [
      { label: "nav.pages.projects", to: PROJECTS_PATH, icon: FolderOutlined, allowedRoles: null, keywords: ["projects", "dự án"] },
      {
        label: "nav.pages.finance",
        to: "/transaction-manager/transactions",
        icon: AccountBalanceWalletOutlined,
        allowedRoles: ROLE_ACCESS.transactionsPage,
        keywords: ["finance", "transactions", "balance", "deposit", "export", "vinnet", "gotit", "tài chính", "giao dịch", "số dư"],
      },
    ],
  },
  {
    label: "nav.groups.admin",
    items: [
      {
        label: "nav.pages.accounts",
        to: "/account-management/accounts",
        icon: ManageAccountsOutlined,
        allowedRoles: ROLE_ACCESS.accountsPage,
        keywords: ["accounts", "users", "roles", "password", "tài khoản", "người dùng"],
      },
    ],
  },
];

export const getAppNavGroupsForRole = (role: string | null | undefined): AppNavGroup[] =>
  APP_NAV_GROUPS
    .map((group) => ({ ...group, items: group.items.filter((item) => hasRole(role, item.allowedRoles)) }))
    .filter((group) => group.items.length > 0);
