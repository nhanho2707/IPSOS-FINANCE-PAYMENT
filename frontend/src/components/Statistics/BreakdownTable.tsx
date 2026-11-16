import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, ButtonBase, Typography } from "@mui/material";
import { Check, FileDownloadOutlined } from "@mui/icons-material";
import * as XLSX from "xlsx";
import { BRAND, NEUTRAL } from "../../config/ThemeConfig";
import { ColumnFormat } from "../../config/ColumnConfig";
import { BreakdownStatistics, formatMinutes, SortDirection } from "../../config/StatisticsConfig";
import { formatMoney, formatNumber } from "../../utils/format";
import EmptyState from "../EmptyState";
import SearchTextBox from "../SearchTextBox";
import StatusChip from "../StatusChip";
import ReusableTable from "../Table/ReusableTable";
import CellStack from "../Table/CellStack";
import SortHeader from "./SortHeader";
import { useTranslation } from "react-i18next";

export interface BreakdownRow extends BreakdownStatistics {
    key: string;
    primary: string;
    secondary?: string;
}

type SortColumn = "primary" | keyof BreakdownStatistics;

interface BreakdownTableProps {
    title: string;
    description: string;
    nameLabel: string;
    // The Excel file keeps English headers in every language, so a sheet reads the same whoever exported it.
    exportHeaders: { sheet: string; name: string; secondary: string };
    rows: BreakdownRow[];
    loading: boolean;
    selectedKey?: string | null;
    onSelect: (row: BreakdownRow) => void;
    selectHint: string;
    searchPlaceholder: string;
    exportFileName: string;
}

const compare = (a: BreakdownRow, b: BreakdownRow, column: SortColumn): number => {
    if (column === "primary") return a.primary.localeCompare(b.primary, undefined, { numeric: true });

    const left = a[column];
    const right = b[column];

    // Rows without a measurable wait stay at the end whichever way the column is sorted.
    if (left === null || right === null) return Number(left === null) - Number(right === null);

    return left - right;
};

// Interviews, gifts and waits for each interviewer or project, sortable and exportable.
const BreakdownTable: React.FC<BreakdownTableProps> = ({ title, description, nameLabel, exportHeaders, rows, loading, selectedKey, onSelect, selectHint, searchPlaceholder, exportFileName }) => {
    const { t } = useTranslation();
    const [ search, setSearch ] = useState("");
    const [ sort, setSort ] = useState<{ column: SortColumn; direction: SortDirection }>({ column: "interviews", direction: "desc" });
    const [ page, setPage ] = useState(0);
    const [ rowsPerPage, setRowsPerPage ] = useState(10);

    const maxInterviews = Math.max(1, ...rows.map((row) => row.interviews));

    const visibleRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        const matching = term
            ? rows.filter((row) => row.primary.toLowerCase().includes(term) || row.secondary?.toLowerCase().includes(term))
            : rows;

        return [...matching].sort((a, b) => {
            const order = compare(a, b, sort.column);
            const missing = sort.column !== "primary" && (a[sort.column] === null || b[sort.column] === null);
            return missing || sort.direction === "asc" ? order : -order;
        });
    }, [rows, search, sort]);

    useEffect(() => {
        setPage(0);
    }, [rows, search, sort]);

    const toggleSort = (column: SortColumn) => setSort((current) => ({
        column,
        // Numbers start from the largest, names from A.
        direction: current.column === column ? (current.direction === "asc" ? "desc" : "asc") : column === "primary" ? "asc" : "desc",
    }));

    const header = (column: SortColumn, label: string, alignRight = true) => () => (
        <SortHeader label={label} active={sort.column === column} direction={sort.direction} onClick={() => toggleSort(column)} alignRight={alignRight} />
    );

    const exportRows = () => {
        const sheet = XLSX.utils.json_to_sheet(visibleRows.map((row) => ({
            [exportHeaders.name]: row.primary,
            [exportHeaders.secondary]: row.secondary ?? "",
            "Interviews": row.interviews,
            "Gifts": row.gifts,
            "Gift value": row.amount,
            "Median wait (minutes)": row.median_wait_minutes ?? "",
            "Needs review": row.review,
        })));
        const book = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(book, sheet, exportHeaders.sheet.slice(0, 31));
        XLSX.writeFile(book, exportFileName);
    };

    const columns: ColumnFormat[] = [
        {
            label: nameLabel,
            name: "primary",
            type: "string",
            // Fixed, so a narrow screen scrolls the table sideways instead of clipping the code.
            width: 200,
            renderHeader: header("primary", nameLabel, false),
            renderCell: (row: BreakdownRow) => (
                <ButtonBase
                    onClick={() => onSelect(row)}
                    aria-pressed={selectedKey === undefined ? undefined : row.key === selectedKey}
                    aria-label={`${row.primary}: ${selectHint}`}
                    sx={{ display: "flex", justifyContent: "flex-start", gap: 0.75, maxWidth: "100%", textAlign: "left", borderRadius: "6px", "&.Mui-focusVisible": { outline: `2px solid ${BRAND.accent}`, outlineOffset: 2 } }}
                >
                    {row.key === selectedKey && <Check sx={{ fontSize: 16, color: "primary.main", flexShrink: 0 }} />}
                    <CellStack primary={row.primary} secondary={row.secondary} numeric />
                </ButtonBase>
            ),
        },
        {
            label: t("statistics.breakdown.interviews"),
            name: "interviews",
            type: "number",
            renderHeader: header("interviews", t("statistics.breakdown.interviews"), false),
            renderCell: (row: BreakdownRow) => (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                    <Box component="span" sx={{ width: 48, flexShrink: 0, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {formatNumber(row.interviews)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 24, height: 8 }}>
                        <Box sx={{ height: "100%", width: `max(2px, ${(row.interviews / maxInterviews) * 100}%)`, borderRadius: "0 4px 4px 0", bgcolor: BRAND.accent }} />
                    </Box>
                </Box>
            ),
        },
        {
            label: t("statistics.breakdown.gifts"),
            name: "gifts",
            type: "number",
            align: "right",
            width: 88,
            renderHeader: header("gifts", t("statistics.breakdown.gifts")),
            renderCell: (row: BreakdownRow) => formatNumber(row.gifts),
        },
        {
            label: t("statistics.breakdown.giftValue"),
            name: "amount",
            type: "number",
            align: "right",
            width: 132,
            renderHeader: header("amount", t("statistics.breakdown.giftValue")),
            renderCell: (row: BreakdownRow) => formatMoney(row.amount),
        },
        {
            label: t("statistics.breakdown.medianWait"),
            name: "median_wait_minutes",
            type: "number",
            align: "right",
            width: 136,
            renderHeader: header("median_wait_minutes", t("statistics.breakdown.medianWait")),
            renderCell: (row: BreakdownRow) => formatMinutes(row.median_wait_minutes),
        },
        {
            label: t("statistics.breakdown.toReview"),
            name: "review",
            type: "number",
            align: "right",
            width: 128,
            renderHeader: header("review", t("statistics.breakdown.toReview")),
            renderCell: (row: BreakdownRow) => row.review > 0
                ? <StatusChip label={formatNumber(row.review)} tone="danger" tooltip={t("statistics.breakdown.reviewTooltip")} />
                : <Box component="span" sx={{ color: NEUTRAL[400] }}>0</Box>,
        },
    ];

    return (
        <ReusableTable
            inset={false}
            header={
                <Box sx={{ display: "flex", alignItems: { xs: "stretch", md: "center" }, flexDirection: { xs: "column", md: "row" }, gap: 1.5, px: 2.5, py: 1.75, borderBottom: 1, borderColor: "divider" }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h2" component="h2">{title}</Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>{description}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                        <SearchTextBox placeholder={searchPlaceholder} onSearchChange={setSearch} debounceMs={150} sx={{ width: { xs: "100%", sm: 240 } }} />
                        <Button
                            size="small"
                            color="inherit"
                            variant="outlined"
                            startIcon={<FileDownloadOutlined />}
                            disabled={visibleRows.length === 0}
                            onClick={exportRows}
                        >
                            {t("statistics.breakdown.exportExcel")}
                        </Button>
                    </Box>
                </Box>
            }
            columns={columns}
            data={visibleRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)}
            getRowKey={(row) => row.key}
            actionStatus={{ type: "fetch", loading }}
            page={page}
            rowsPerPage={rowsPerPage}
            total={visibleRows.length}
            onPageChange={(_event, nextPage) => setPage(nextPage)}
            onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
            }}
            onRowClick={onSelect}
            emptyState={<EmptyState dense title={search ? t("statistics.breakdown.nothingMatches", { term: search }) : t("statistics.breakdown.noInterviews")} />}
        />
    );
};

export default BreakdownTable;
