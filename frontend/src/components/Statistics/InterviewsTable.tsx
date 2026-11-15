import React, { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { FileDownloadOutlined } from "@mui/icons-material";
import dayjs from "dayjs";
import { ColumnFormat } from "../../config/ColumnConfig";
import { STATUS_TONES } from "../../config/ThemeConfig";
import { formatMinutes, INTERVIEW_GIFT_STATUS, InterviewRow, InterviewSort, InterviewView, StatisticsFilters } from "../../config/StatisticsConfig";
import { useStatisticsInterviews } from "../../hook/useStatisticsInterviews";
import { useToast } from "../../contexts/ToastContext";
import { formatDateTime, formatMoney, formatPhone } from "../../utils/format";
import EmptyState from "../EmptyState";
import ProviderBadge from "../ProviderBadge";
import StatusChip from "../StatusChip";
import CellStack from "../Table/CellStack";
import ResourceTable from "../Table/ResourceTable";
import InterviewDrawer from "./InterviewDrawer";
import SortHeader from "./SortHeader";

const VIEW_LABELS: Record<InterviewView, string> = {
    review: "To review",
    all: "All interviews",
    no_gift: "No gift",
};

const EMPTY_TEXT: Record<InterviewView, string> = {
    review: "No gift was sent before its interview ended",
    all: "No interviews for these filters",
    no_gift: "Every interview received a gift",
};

interface InterviewsTableProps {
    projectId: number;
    filters: StatisticsFilters;
    toleranceMinutes: number;
    activeEmployee: string | null;
    onFilterEmployee: (code: string) => void;
}

// The interviews behind the charts: what to check, everything, or the ones without a gift.
const InterviewsTable: React.FC<InterviewsTableProps> = ({ projectId, filters, toleranceMinutes, activeEmployee, onFilterEmployee }) => {
    const { rows, total, counts, view, setView, search, setSearch, sort, toggleSort, page, setPage, rowsPerPage, setRowsPerPage, actionState, exporting, exportInterviews } = useStatisticsInterviews(projectId, filters);
    const { showToast } = useToast();
    const [ selected, setSelected ] = useState<InterviewRow | null>(null);
    const allProjects = projectId === 0;

    const header = (column: InterviewSort, label: string, alignRight = false) => () => (
        <SortHeader label={label} active={sort.sort === column} direction={sort.direction} onClick={() => toggleSort(column)} alignRight={alignRight} />
    );

    const handleExport = async () => {
        const error = await exportInterviews(`interviews_${view}_${dayjs().format("YYYYMMDD")}.xlsx`);
        if (error) showToast(`Export failed: ${error}`, "error");
    };

    const columns: ColumnFormat[] = [
        {
            label: "Respondent",
            name: "respondent_id",
            type: "string",
            width: 136,
            renderHeader: header("respondent_id", "Respondent"),
            renderCell: (row: InterviewRow) => <CellStack primary={row.respondent_id || "—"} secondary={formatPhone(row.phone)} numeric />,
        },
        ...(allProjects ? [{
            label: "Project",
            name: "project_code",
            type: "string" as const,
            flex: 1.3,
            renderCell: (row: InterviewRow) => (
                <CellStack primary={row.project_code || "—"} secondary={row.project_name ?? undefined} title={row.project_name ?? undefined} />
            ),
        }] : []),
        {
            label: "Channel",
            name: "channel",
            type: "string",
            width: 96,
            renderCell: (row: InterviewRow) => <ProviderBadge provider={row.channel} />,
        },
        {
            label: "Interviewer",
            name: "employee_id",
            type: "string",
            width: 168,
            renderHeader: header("employee_id", "Interviewer"),
            renderCell: (row: InterviewRow) => <CellStack primary={row.employee_id || "—"} secondary={row.employee_name || undefined} title={row.employee_name} numeric />,
        },
        {
            label: "Interview",
            name: "interview_start",
            type: "date",
            width: 164,
            renderHeader: header("interview_start", "Interview"),
            renderCell: (row: InterviewRow) => (
                <CellStack
                    primary={formatDateTime(row.interview_start)}
                    secondary={row.offline ? "Offline import" : row.interview_end ? `Ended ${dayjs(row.interview_end).format("HH:mm")}` : "No end time"}
                    numeric
                />
            ),
        },
        {
            label: "Gift received",
            name: "gift_time",
            type: "date",
            width: 164,
            renderHeader: header("gift_time", "Gift received"),
            renderCell: (row: InterviewRow) => row.gifted
                ? <Box component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>{formatDateTime(row.gift_time)}</Box>
                : <StatusChip label={INTERVIEW_GIFT_STATUS[row.gift_status].label} tone={INTERVIEW_GIFT_STATUS[row.gift_status].tone} />,
        },
        {
            label: "Gift value",
            name: "amount",
            type: "number",
            align: "right",
            width: 116,
            renderHeader: header("amount", "Gift value", true),
            renderCell: (row: InterviewRow) => (row.gifted ? formatMoney(row.amount) : "—"),
        },
        {
            label: "Wait",
            name: "wait_minutes",
            type: "number",
            align: "right",
            width: 96,
            renderHeader: header("wait_minutes", "Wait", true),
            renderCell: (row: InterviewRow) => (
                <Box component="span" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: row.needs_review ? 600 : 400, color: row.needs_review ? STATUS_TONES.danger.fg : undefined }}>
                    {formatMinutes(row.wait_minutes)}
                </Box>
            ),
        },
    ];

    return (
        <Box>
            <Box sx={{ mb: 1.5 }}>
                <Typography variant="h2" component="h2">Interviews</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    The interviews behind the numbers above. “To review” lists gifts sent more than {toleranceMinutes} min before the interview ended.
                </Typography>
            </Box>
            <ResourceTable
                tabs={(Object.keys(VIEW_LABELS) as InterviewView[]).map((value) => ({
                    value,
                    label: VIEW_LABELS[value],
                    count: counts?.[value],
                    alert: value === "review",
                }))}
                tab={view}
                onTabChange={(value) => setView(value as InterviewView)}
                search={{ placeholder: "Search ID, phone or interviewer", onChange: setSearch }}
                toolbarActions={
                    <Button
                        size="small"
                        color="inherit"
                        variant="outlined"
                        startIcon={<FileDownloadOutlined />}
                        loading={exporting}
                        loadingPosition="start"
                        disabled={total === 0}
                        onClick={handleExport}
                    >
                        Export Excel
                    </Button>
                }
                columns={columns}
                data={rows}
                actionStatus={actionState}
                page={page}
                rowsPerPage={rowsPerPage}
                total={total}
                onPageChange={(_event, nextPage) => setPage(nextPage)}
                onRowsPerPageChange={(event) => setRowsPerPage(parseInt(event.target.value, 10))}
                onRowClick={setSelected}
                emptyState={<EmptyState dense title={search ? `Nothing matches “${search}”` : EMPTY_TEXT[view]} />}
            />
            <InterviewDrawer
                interview={selected}
                onClose={() => setSelected(null)}
                showProject={allProjects}
                onFilterEmployee={selected?.employee_id && selected.employee_id !== activeEmployee ? onFilterEmployee : undefined}
            />
        </Box>
    );
};

export default InterviewsTable;
