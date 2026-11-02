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

// The sidebar follows the order work happens in a project; "bottom" items sit apart at the foot of the sidebar.
export type ProjectNavGroup = "overview" | "plan" | "field" | "payments" | "bottom";

export const PROJECT_NAV_GROUPS: { key: Exclude<ProjectNavGroup, "bottom">; label?: string }[] = [
  { key: "overview" },
  { key: "plan", label: "Plan" },
  { key: "field", label: "Field" },
  { key: "payments", label: "Payments" },
];

export interface ProjectNavItem {
  label: string;
  // Page header title, when the short sidebar label needs more context.
  title?: string;
  description: string;
  path: string;
  icon: React.ElementType;
  group: ProjectNavGroup;
  allowedRoles: readonly Role[];
  showIf?: (project: ProjectData | null) => boolean;
}

// The first item a role can open is that role's landing page inside a project (getProjectHomePath).
export const PROJECT_NAV_ITEMS: ProjectNavItem[] = [
  { label: "Overview", description: "Where the project stands: sample, gifts, spending and quotation.", path: "overview", icon: DashboardOutlined, group: "overview", allowedRoles: ROLE_ACCESS.projectOverview },
  { label: "Quotation", description: "Versioned cost quotation and its approval.", path: "quotation", icon: RequestQuoteOutlined, group: "plan", allowedRoles: ROLE_ACCESS.projectQuotation },
  { label: "Assignment", description: "People who can open and work on this project.", path: "assignment", icon: AssignmentIndOutlined, group: "plan", allowedRoles: ROLE_ACCESS.projectAssignment },
  { label: "Interviewers", description: "Interviewers on this project and the gifts sent through them.", path: "parttime-employees", icon: GroupsOutlined, group: "field", allowedRoles: ROLE_ACCESS.projectInterviewers },
  { label: "CATI settings", description: "Respondent batches for phone interviews.", path: "cati-settings", icon: HeadsetMicOutlined, group: "field", allowedRoles: ROLE_ACCESS.projectCatiSettings },
  { label: "Gifts", description: "Send incentives to respondents and follow each delivery.", path: "gifts", icon: CardGiftcardOutlined, group: "payments", allowedRoles: ROLE_ACCESS.projectGifts },
  { label: "Transactions", description: "Every top-up and e-voucher sent for this project.", path: "transactions", icon: ReceiptLongOutlined, group: "payments", allowedRoles: ROLE_ACCESS.projectTransactions },
  { label: "Statistics", title: "Transaction statistics", description: "Interview length and the time from interview to gift.", path: "transaction-statistics", icon: InsightsOutlined, group: "payments", allowedRoles: ROLE_ACCESS.projectTransactionStatistics },
  { label: "Settings", description: "Project details, sample size and province prices.", path: "settings", icon: SettingsOutlined, group: "bottom", allowedRoles: ROLE_ACCESS.projectSettings },
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
