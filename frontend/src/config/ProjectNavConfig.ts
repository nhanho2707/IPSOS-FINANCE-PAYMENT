import React from "react";
import {
  AssignmentIndOutlined,
  CardGiftcardOutlined,
  GroupsOutlined,
  HeadsetMicOutlined,
  InsightsOutlined,
  ReceiptLongOutlined,
  RequestQuoteOutlined,
  SettingsOutlined,
} from "@mui/icons-material";
import { ProjectData } from "./ProjectFieldsConfig";
import { hasRole, Role, ROLE_ACCESS } from "./RoleConfig";

export interface ProjectNavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  placement: "main" | "bottom";
  allowedRoles: readonly Role[];
  showIf?: (project: ProjectData | null) => boolean;
}

export const PROJECT_NAV_ITEMS: ProjectNavItem[] = [
  { label: "Quotation", path: "quotation", icon: RequestQuoteOutlined, placement: "main", allowedRoles: ROLE_ACCESS.projectQuotation },
  { label: "Assignment", path: "assignment", icon: AssignmentIndOutlined, placement: "main", allowedRoles: ROLE_ACCESS.projectAssignment },
  { label: "Interviewers", path: "parttime-employees", icon: GroupsOutlined, placement: "main", allowedRoles: ROLE_ACCESS.projectInterviewers },
  { label: "Gifts", path: "gifts", icon: CardGiftcardOutlined, placement: "main", allowedRoles: ROLE_ACCESS.projectGifts },
  { label: "Transactions", path: "transactions", icon: ReceiptLongOutlined, placement: "main", allowedRoles: ROLE_ACCESS.projectTransactions },
  { label: "Transaction Statistics", path: "transaction-statistics", icon: InsightsOutlined, placement: "main", allowedRoles: ROLE_ACCESS.projectTransactionStatistics },
  { label: "CATI Settings", path: "cati-settings", icon: HeadsetMicOutlined, placement: "main", allowedRoles: ROLE_ACCESS.projectCatiSettings },
  { label: "Settings", path: "settings", icon: SettingsOutlined, placement: "bottom", allowedRoles: ROLE_ACCESS.projectSettings },
];

export const projectNavPath = (projectId: number, path: string) =>
  `/project-management/projects/${projectId}/${path}`;

export const getProjectPageRoles = (path: string): readonly Role[] | undefined =>
  PROJECT_NAV_ITEMS.find((item) => item.path === path)?.allowedRoles;

export const findProjectNavItem = (pathname: string): ProjectNavItem | undefined => {
  const segment = pathname.replace(/\/+$/, "").split("/").pop();
  return PROJECT_NAV_ITEMS.find((item) => item.path === segment);
};

export const getProjectNavItemsForRole = (role: string | null | undefined): ProjectNavItem[] =>
  PROJECT_NAV_ITEMS.filter((item) => hasRole(role, item.allowedRoles));

export const getProjectHomePath = (projectId: number, role: string | null | undefined): string => {
  const first = getProjectNavItemsForRole(role)[0];
  return projectNavPath(projectId, first?.path ?? "transactions");
};
