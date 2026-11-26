import React from "react";
import {
  AssignmentIndOutlined,
  DashboardOutlined,
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
import type { TranslationKey } from "../i18n/i18n";

// The sidebar follows the order work happens in a project; "bottom" items sit apart at the foot of the sidebar.
export type ProjectNavGroup = "overview" | "plan" | "field" | "payments" | "bottom";

export const PROJECT_NAV_GROUPS: { key: Exclude<ProjectNavGroup, "bottom">; label?: TranslationKey }[] = [
  { key: "overview" },
  { key: "plan", label: "nav.groups.plan" },
  { key: "field", label: "nav.groups.field" },
  { key: "payments", label: "nav.groups.payments" },
];

export interface ProjectNavItem {
  label: TranslationKey;
  // Page header title, when the short sidebar label needs more context.
  title?: TranslationKey;
  description: TranslationKey;
  path: string;
  icon: React.ElementType;
  group: ProjectNavGroup;
  allowedRoles: readonly Role[];
  showIf?: (project: ProjectData | null) => boolean;
}

// The first item a role can open is that role's landing page inside a project (getProjectHomePath).
export const PROJECT_NAV_ITEMS: ProjectNavItem[] = [
  { label: "nav.project.overview.label", description: "nav.project.overview.description", path: "overview", icon: DashboardOutlined, group: "overview", allowedRoles: ROLE_ACCESS.projectOverview },
  { label: "nav.project.quotation.label", description: "nav.project.quotation.description", path: "quotation", icon: RequestQuoteOutlined, group: "plan", allowedRoles: ROLE_ACCESS.projectQuotation },
  { label: "nav.project.assignment.label", description: "nav.project.assignment.description", path: "assignment", icon: AssignmentIndOutlined, group: "plan", allowedRoles: ROLE_ACCESS.projectAssignment },
  { label: "nav.project.interviewers.label", description: "nav.project.interviewers.description", path: "parttime-employees", icon: GroupsOutlined, group: "field", allowedRoles: ROLE_ACCESS.projectInterviewers },
  { label: "nav.project.catiSettings.label", description: "nav.project.catiSettings.description", path: "cati-settings", icon: HeadsetMicOutlined, group: "field", allowedRoles: ROLE_ACCESS.projectCatiSettings },
  { label: "nav.project.gifts.label", description: "nav.project.gifts.description", path: "gifts", icon: CardGiftcardOutlined, group: "payments", allowedRoles: ROLE_ACCESS.projectGifts },
  { label: "nav.project.transactions.label", description: "nav.project.transactions.description", path: "transactions", icon: ReceiptLongOutlined, group: "payments", allowedRoles: ROLE_ACCESS.projectTransactions },
  { label: "nav.project.statistics.label", title: "nav.project.statistics.title", description: "nav.project.statistics.description", path: "transaction-statistics", icon: InsightsOutlined, group: "payments", allowedRoles: ROLE_ACCESS.projectTransactionStatistics },
  { label: "nav.project.settings.label", description: "nav.project.settings.description", path: "settings", icon: SettingsOutlined, group: "bottom", allowedRoles: ROLE_ACCESS.projectSettings },
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
