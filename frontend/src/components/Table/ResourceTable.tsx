import React from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { STATUS_TONES } from "../../config/ThemeConfig";
import { formatNumber } from "../../utils/format";
import SearchTextBox from "../SearchTextBox";
import ReusableTable, { ReusableTableProps } from "./ReusableTable";

export interface ResourceTableTab {
    value: string;
    label: string;
    count?: number;
    // Counts that need attention (failed gifts) are drawn in red.
    alert?: boolean;
}

interface ResourceTableSearch {
    placeholder: string;
    onChange: (value: string) => void;
    defaultValue?: string;
}

interface ResourceTableProps<T extends object> extends Omit<ReusableTableProps<T>, "header" | "topToolbar" | "inset"> {
    tabs?: ResourceTableTab[];
    tab?: string;
    onTabChange?: (value: string) => void;
    search?: ResourceTableSearch;
    // FilterChip elements.
    filters?: React.ReactNode;
    // Right side of the toolbar: secondary table-level actions such as Export.
    toolbarActions?: React.ReactNode;
    // A <BulkActionBar>, shown between the toolbar and the table while rows are selected.
    bulkBar?: React.ReactNode;
    // Results the user needs to read, e.g. an <Alert> summarising an import.
    banner?: React.ReactNode;
}

const TabLabel: React.FC<{ tab: ResourceTableTab }> = ({ tab }) => (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
        {tab.label}
        {tab.count !== undefined && (
            <Box
                component="span"
                sx={{
                    minWidth: 20,
                    px: 0.75,
                    borderRadius: 999,
                    typography: "caption",
                    fontWeight: 600,
                    lineHeight: "18px",
                    textAlign: "center",
                    fontVariantNumeric: "tabular-nums",
                    bgcolor: tab.alert && tab.count > 0 ? STATUS_TONES.danger.bg : "action.hover",
                    color: tab.alert && tab.count > 0 ? STATUS_TONES.danger.fg : "text.secondary",
                }}
            >
                {formatNumber(tab.count)}
            </Box>
        )}
    </Box>
);

// The list-page pattern: one card holding status tabs, a toolbar (search, filter chips, table actions),
// an optional bulk bar and result banner, then the table and pagination.
const ResourceTable = <T extends object>({
    tabs,
    tab,
    onTabChange,
    search,
    filters,
    toolbarActions,
    bulkBar,
    banner,
    ...tableProps
}: ResourceTableProps<T>) => {
    const hasToolbar = Boolean(search || filters || toolbarActions);

    const header = (
        <>
            {tabs && tabs.length > 0 && (
                <Tabs
                    value={tab ?? tabs[0].value}
                    onChange={(_, value: string) => onTabChange?.(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{ px: 2, minHeight: 44, borderBottom: 1, borderColor: "divider" }}
                >
                    {tabs.map((item) => (
                        <Tab key={item.value} value={item.value} label={<TabLabel tab={item} />} sx={{ typography: "body2", fontWeight: 500 }} />
                    ))}
                </Tabs>
            )}

            {hasToolbar && (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 1,
                        px: 2,
                        py: 1.25,
                        borderBottom: 1,
                        borderColor: "divider",
                    }}
                >
                    {search && (
                        <SearchTextBox
                            placeholder={search.placeholder}
                            defaultValue={search.defaultValue}
                            onSearchChange={search.onChange}
                            sx={{ width: { xs: "100%", sm: 300 } }}
                        />
                    )}
                    {filters}
                    {toolbarActions && (
                        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                            {toolbarActions}
                        </Box>
                    )}
                </Box>
            )}

            {bulkBar}

            {banner && <Box sx={{ px: 2, pt: 1.5 }}>{banner}</Box>}
        </>
    );

    return <ReusableTable {...tableProps} header={header} inset={false} />;
};

export default ResourceTable;
