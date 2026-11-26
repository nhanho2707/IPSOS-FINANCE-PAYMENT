import React from "react";

export interface ColumnFormat {
    label: string,
    name: string,
    type: "string" | "number" | "select" | "image" | "date" | "menu" | "boolean",
    align?: "center" | "left" | "right"
    width?: number, 
    flex?: number,
    options?: { value: any, label: string }[],
    grid?: number,
    order?: number,
    visible?: boolean,
    renderHeader?: () => React.ReactNode,
    renderCell?: (row: any) => React.ReactNode,
    renderAction?: (row: any) => React.ReactNode,
}

// Lists open with 25 rows: one screen of the busiest lists (projects, gifts) without paging,
// while a page of the slower queries (transactions) still loads quickly.
export const DEFAULT_ROWS_PER_PAGE = 25;

export const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
