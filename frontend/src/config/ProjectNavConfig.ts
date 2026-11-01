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

export interface ProjectNavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  placement: "main" | "bottom";
  showIf?: (project: ProjectData | null) => boolean;
}

export const PROJECT_NAV_ITEMS: ProjectNavItem[] = [
  { label: "Quotation", path: "quotation", icon: RequestQuoteOutlined, placement: "main" },
  { label: "Assignment", path: "assignment", icon: AssignmentIndOutlined, placement: "main" },
  { label: "Interviewers", path: "parttime-employees", icon: GroupsOutlined, placement: "main" },
  { label: "Gifts", path: "gifts", icon: CardGiftcardOutlined, placement: "main" },
  { label: "Transactions", path: "transactions", icon: ReceiptLongOutlined, placement: "main" },
  { label: "Transaction Statistics", path: "transaction-statistics", icon: InsightsOutlined, placement: "main" },
  { label: "CATI Settings", path: "cati-settings", icon: HeadsetMicOutlined, placement: "main" },
  { label: "Settings", path: "settings", icon: SettingsOutlined, placement: "bottom" },
];

export const projectNavPath = (projectId: number, path: string) =>
  `/project-management/projects/${projectId}/${path}`;

export const findProjectNavItem = (pathname: string): ProjectNavItem | undefined => {
  const segment = pathname.replace(/\/+$/, "").split("/").pop();
  return PROJECT_NAV_ITEMS.find((item) => item.path === segment);
};
