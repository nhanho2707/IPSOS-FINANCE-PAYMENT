import React, { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { FileDownloadOutlined } from "@mui/icons-material";
import dayjs from "dayjs";
import { ColumnFormat } from "../../config/ColumnConfig";
import { STATUS_TONES } from "../../config/ThemeConfig";
import { formatMinutes, interviewGiftStatus, InterviewRow, InterviewSort, InterviewView, StatisticsFilters } from "../../config/StatisticsConfig";
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
import { useTranslation } from "react-i18next";

const VIEWS: InterviewView[] = ["review", "all", "no_gift"];

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
    const { t } = useTranslation();
    const [ selected, setSelected ] = useState<InterviewRow | null>(null);
    const allProjects = projectId === 0;

    const header = (column: InterviewSort, label: string, alignRight = false) => () => (
        <SortHeader label={label} active={sort.sort === column} direction={sort.direction} onClick={() => toggleSort(column)} alignRight={alignRight} />
    );

    const handleExport = async () => {
        const error = await exportInterviews(`interviews_${view}_${dayjs().format("YYYYMMDD")}.xlsx`);
        if (error) showToast(t("statistics.interviews.exportFailed", { error }), "error");
    };

    const columns: ColumnFormat[] = [
        {
            label: t("statistics.interviews.columns.respondent"),
            name: "respondent_id",
            type: "string",
            width: 136,
            renderHeader: header("respondent_id", t("statistics.interviews.columns.respondent")),
            renderCell: (row: InterviewRow) => <CellStack primary={row.respondent_id || "—"} secondary={formatPhone(row.phone)} numeric />,
        },
        ...(allProjects ? [{
            label: t("statistics.interviews.columns.project"),
            name: "project_code",
            type: "string" as const,
            flex: 1.3,
            renderCell: (row: InterviewRow) => (
                <CellStack primary={row.project_code || "—"} secondary={row.project_name ?? undefined} title={row.project_name ?? undefined} />
            ),
        }] : []),
        {
            label: t("statistics.interviews.columns.channel"),
            name: "channel",
            type: "string",
            width: 96,
            renderCell: (row: InterviewRow) => <ProviderBadge provider={row.channel} />,
        },
        {
            label: t("statistics.interviews.columns.interviewer"),
            name: "employee_id",
            type: "string",
            width: 168,
            renderHeader: header("employee_id", t("statistics.interviews.columns.interviewer")),
            renderCell: (row: InterviewRow) => <CellStack primary={row.employee_id || "—"} secondary={row.employee_name || undefined} title={row.employee_name} numeric />,
        },
        {
            label: t("statistics.interviews.columns.interview"),
            name: "interview_start",
            type: "date",
            width: 164,
            renderHeader: header("interview_start", t("statistics.interviews.columns.interview")),
            renderCell: (row: InterviewRow) => (
                <CellStack
                    primary={formatDateTime(row.interview_start)}
                    secondary={row.offline ? t("statistics.interviews.offlineImport") : row.interview_end ? t("statistics.interviews.endedAt", { time: dayjs(row.interview_end).format("HH:mm") }) : t("statistics.interviews.noEnd")}
                    numeric
                />
            ),
        },
        {
            label: t("statistics.interviews.columns.giftReceived"),
            name: "gift_time",
            type: "date",
            width: 164,
            renderHeader: header("gift_time", t("statistics.interviews.columns.giftReceived")),
            renderCell: (row: InterviewRow) => row.gifted
                ? <Box component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>{formatDateTime(row.gift_time)}</Box>
                : <StatusChip label={interviewGiftStatus(row.gift_status).label} tone={interviewGiftStatus(row.gift_status).tone} />,
        },
        {
            label: t("statistics.interviews.columns.giftValue"),
            name: "amount",
            type: "number",
            align: "right",
            width: 116,
            renderHeader: header("amount", t("statistics.interviews.columns.giftValue"), true),
            renderCell: (row: InterviewRow) => (row.gifted ? formatMoney(row.amount) : "—"),
        },
        {
            label: t("statistics.interviews.columns.wait"),
            name: "wait_minutes",
            type: "number",
            align: "right",
            width: 96,
            renderHeader: header("wait_minutes", t("statistics.interviews.columns.wait"), true),
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
                <Typography variant="h2" component="h2">{t("statistics.interviews.title")}</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {t("statistics.interviews.description", { minutes: toleranceMinutes })}
                </Typography>
            </Box>
            <ResourceTable
                tabs={VIEWS.map((value) => ({
                    value,
                    label: t(`statistics.interviews.views.${value}`),
                    count: counts?.[value],
                    alert: value === "review",
                }))}
                tab={view}
                onTabChange={(value) => setView(value as InterviewView)}
                search={{ placeholder: t("statistics.interviews.search"), onChange: setSearch }}
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
                        {t("statistics.interviews.exportExcel")}
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
                emptyState={<EmptyState dense title={search ? t("statistics.interviews.nothingMatches", { term: search }) : t(`statistics.interviews.empty.${view}`)} />}
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
