import React, { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Grid, Link, Paper, Stack, Typography } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import StatCard from "../../components/StatCard";
import StatusChip from "../../components/StatusChip";
import SampleProgress from "../../components/SampleProgress";
import UserAvatar from "../../components/UserAvatar";
import ReusableTable from "../../components/Table/ReusableTable";
import { ColumnFormat } from "../../config/ColumnConfig";
import { ProjectData, ProvinceData } from "../../config/ProjectFieldsConfig";
import { projectNavPath } from "../../config/ProjectNavConfig";
import { QuotationVersionData } from "../../config/QuotationConfig";
import { hasRole, ROLE_ACCESS } from "../../config/RoleConfig";
import { getStatusTone, PROJECT_STATUS_TONE, QUOTATION_STATUS_TONE } from "../../config/ThemeConfig";
import { useAuth } from "../../contexts/AuthContext";
import { useProjectContext } from "../../hook/useProjectContext";
import { useProjectOverview } from "../../hook/useProjectOverview";
import { formatDate, formatDateRange, formatFieldTiming, formatMoney, formatNumber, formatStatus } from "../../utils/format";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n/i18n";

const sampleTarget = (project: ProjectData | null) =>
    project?.provinces?.reduce((sum: number, p: ProvinceData) => sum + (p.sample_size_main || 0) + (p.sample_size_booters || 0), 0) ?? 0;

const describeQuotation = (version: QuotationVersionData): string => {
    switch (version.status) {
        case "approved":
            return i18n.t("projects.overview.quotationApproved", { name: version.approved_user?.name ?? "—", date: formatDate(version.approved_at) });
        case "fm_confirmed":
            return i18n.t("projects.overview.quotationFmConfirmed", { name: version.fm_confirmed_user?.name ?? "—", date: formatDate(version.fm_confirmed_at) });
        case "submitted":
            return i18n.t("projects.overview.quotationSubmitted", { name: version.created_user?.name ?? "—" });
        default:
            return i18n.t("projects.overview.quotationDraft", { name: version.created_user?.name ?? "—" });
    }
};

const CardLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
    <Link
        component={RouterLink}
        to={to}
        underline="hover"
        sx={{ mt: 1.5, display: "inline-flex", alignItems: "center", gap: 0.5, typography: "body2", fontWeight: 500, alignSelf: "flex-start" }}
    >
        {children}
        <ArrowForward sx={{ fontSize: 14 }} />
    </Link>
);

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <>
        <Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>{label}</Typography>
        <Typography component="dd" variant="body2" sx={{ m: 0, minWidth: 0, overflowWrap: "anywhere" }}>{children || "—"}</Typography>
    </>
);

const provinceColumns = (): ColumnFormat[] => [
    { label: i18n.t("projects.overview.province"), name: "name", type: "string", flex: 1.4 },
    { label: i18n.t("projects.overview.main"), name: "sample_size_main", type: "number", align: "right", flex: 1, renderCell: (row: ProvinceData) => formatNumber(row.sample_size_main) },
    { label: i18n.t("projects.overview.boosters"), name: "sample_size_booters", type: "number", align: "right", flex: 1, renderCell: (row: ProvinceData) => formatNumber(row.sample_size_booters) },
    { label: i18n.t("projects.overview.total"), name: "total", type: "number", align: "right", flex: 1, renderCell: (row: ProvinceData) => formatNumber((row.sample_size_main || 0) + (row.sample_size_booters || 0)) },
];

const Overview: React.FC = () => {
    const { projectId, project } = useProjectContext();
    const { user } = useAuth();
    const { t } = useTranslation();

    const access = useMemo(() => ({
        statistics: hasRole(user?.role, ROLE_ACCESS.projectTransactionStatistics),
        gifts: hasRole(user?.role, ROLE_ACCESS.projectGifts),
        quotation: hasRole(user?.role, ROLE_ACCESS.projectQuotation),
    }), [user?.role]);
    const canManageInterviewers = hasRole(user?.role, ROLE_ACCESS.projectInterviewers);

    const { statistics, giftCounts, latestQuotation, actionState } = useProjectOverview(projectId, access);
    const loading = Boolean(actionState.loading);

    const target = sampleTarget(project);
    const completed = project?.count_respondents ?? 0;
    const failed = giftCounts?.failed ?? 0;
    const owner = project?.created_user_id?.name;

    const kpiCount = 3 + Number(access.gifts) + Number(access.statistics) + Number(access.quotation);
    // Roles see four or six cards: four fit one row on wide screens, six make two rows of three.
    const kpiWidth = kpiCount === 4 ? 3 : 4;

    return (
        <Stack spacing={2.5}>
            <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6, lg: kpiWidth }}>
                    <StatCard
                        label={t("projects.overview.sample")}
                        value={`${formatNumber(completed)} / ${formatNumber(target)}`}
                        caption={target > 0 ? t("projects.overview.sampleCaption") : t("projects.overview.noSampleYet")}
                        loading={!project}
                    >
                        {project && target > 0 && (
                            <Box sx={{ mt: 1 }}>
                                <SampleProgress
                                    completed={completed}
                                    target={target}
                                    fieldStart={project.planned_field_start}
                                    fieldEnd={project.planned_field_end}
                                    status={project.status}
                                    hideCounts
                                />
                            </Box>
                        )}
                    </StatCard>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, lg: kpiWidth }}>
                    <StatCard
                        label={t("projects.overview.fieldPeriod")}
                        value={formatDateRange(project?.planned_field_start, project?.planned_field_end) ?? t("projects.overview.notPlanned")}
                        caption={formatFieldTiming(project?.planned_field_start, project?.planned_field_end, project?.status) ?? undefined}
                        loading={!project}
                        action={project?.status ? (
                            <StatusChip label={formatStatus(project.status)} tone={getStatusTone(project.status, PROJECT_STATUS_TONE)} />
                        ) : undefined}
                    />
                </Grid>

                {access.gifts && (
                    <Grid size={{ xs: 12, sm: 6, lg: kpiWidth }}>
                        <StatCard
                            label={t("projects.overview.giftsSent")}
                            value={giftCounts ? formatNumber(giftCounts.success) : "—"}
                            caption={giftCounts
                                ? t("projects.overview.giftsCaption", { pending: formatNumber(giftCounts.pending), refused: formatNumber(giftCounts.refused) })
                                : loading ? undefined : t("projects.overview.notAvailable")}
                            loading={loading && !giftCounts}
                            action={failed > 0 ? <StatusChip label={t("projects.overview.failedCount", { failed: formatNumber(failed) })} tone="danger" /> : undefined}
                        >
                            <CardLink to={projectNavPath(projectId, "gifts")}>{failed > 0 ? t("projects.overview.reviewGifts") : t("projects.overview.openGifts")}</CardLink>
                        </StatCard>
                    </Grid>
                )}

                {access.statistics && (
                    <Grid size={{ xs: 12, sm: 6, lg: kpiWidth }}>
                        <StatCard
                            label={t("projects.overview.paidOut")}
                            value={statistics ? formatMoney(statistics.amount) : "—"}
                            caption={statistics
                                ? t("projects.overview.paidCaption", { gifts: formatNumber(statistics.gifts), vinnet: formatMoney(statistics.by_channel?.vinnet?.amount), gotit: formatMoney(statistics.by_channel?.gotit?.amount) })
                                : loading ? undefined : t("projects.overview.notAvailable")}
                            loading={loading && !statistics}
                        >
                            <CardLink to={projectNavPath(projectId, "transaction-statistics")}>{t("projects.overview.statistics")}</CardLink>
                        </StatCard>
                    </Grid>
                )}

                {access.quotation && (
                    <Grid size={{ xs: 12, sm: 6, lg: kpiWidth }}>
                        <StatCard
                            label={t("projects.overview.quotation")}
                            value={latestQuotation ? t("projects.overview.version", { version: latestQuotation.version }) : loading ? "—" : t("projects.overview.noQuotation")}
                            caption={latestQuotation ? describeQuotation(latestQuotation) : undefined}
                            loading={loading && !latestQuotation}
                            action={latestQuotation ? (
                                <StatusChip label={formatStatus(latestQuotation.status)} tone={getStatusTone(latestQuotation.status, QUOTATION_STATUS_TONE)} />
                            ) : undefined}
                        >
                            <CardLink to={projectNavPath(projectId, "quotation")}>{t("projects.overview.openQuotation")}</CardLink>
                        </StatCard>
                    </Grid>
                )}

                <Grid size={{ xs: 12, sm: 6, lg: kpiWidth }}>
                    <StatCard
                        label={t("projects.overview.interviewers")}
                        value={formatNumber(project?.count_employees ?? 0)}
                        caption={project?.count_employees ? t("projects.overview.interviewersWorking") : t("projects.overview.interviewersNone")}
                        loading={!project}
                    >
                        {canManageInterviewers && (
                            <CardLink to={projectNavPath(projectId, "parttime-employees")}>{t("projects.overview.manageInterviewers")}</CardLink>
                        )}
                    </StatCard>
                </Grid>

            </Grid>

            <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <Paper elevation={0} sx={{ height: "100%", border: 1, borderColor: "divider", borderRadius: "12px", p: 2.5 }}>
                        <Typography variant="h2" component="h2" sx={{ mb: 2 }}>{t("projects.overview.details")}</Typography>
                        <Box
                            component="dl"
                            sx={{ m: 0, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "160px 1fr" }, columnGap: 2, rowGap: 1.25 }}
                        >
                            <DetailRow label={t("projects.overview.internalCode")}>{project?.internal_code}</DetailRow>
                            <DetailRow label={t("projects.overview.symphony")}>{project?.symphony}</DetailRow>
                            <DetailRow label={t("projects.overview.platform")}>{project?.platform}</DetailRow>
                            <DetailRow label={t("projects.overview.projectTypes")}>{project?.project_types?.join(", ")}</DetailRow>
                            <DetailRow label={t("projects.overview.teams")}>{project?.teams?.join(", ")}</DetailRow>
                            <DetailRow label={t("projects.overview.owner")}>
                                {owner && (
                                    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                                        <UserAvatar name={owner} size={22} showTooltip={false} />
                                        {owner}
                                    </Box>
                                )}
                            </DetailRow>
                            <DetailRow label={t("projects.overview.actualFieldPeriod")}>
                                {formatDateRange(project?.actual_field_start, project?.actual_field_end)}
                            </DetailRow>
                            <DetailRow label={t("projects.overview.objectives")}>{project?.project_objectives}</DetailRow>
                        </Box>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 5 }}>
                    <ReusableTable
                        header={<Typography variant="h2" component="h2" sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>{t("projects.overview.provinces")}</Typography>}
                        columns={provinceColumns()}
                        data={project?.provinces ?? []}
                        actionStatus={{ loading: !project }}
                        emptyText={t("projects.overview.noProvinces")}
                        inset={false}
                        dense
                    />
                </Grid>
            </Grid>
        </Stack>
    );
};

export default Overview;
