import { Alert, Autocomplete, Box, Button, ButtonBase, Checkbox, Grid, LinearProgress, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import { useVinnetAccount } from "../../hook/useVinnetAccount";
import FormDialog from "../../components/Dialogs/FormDialog";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import StatusChip from "../../components/StatusChip";
import ProviderBadge from "../../components/ProviderBadge";
import DateRangeField from "../../components/DateRangeField";
import { useToast } from "../../contexts/ToastContext";
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { ApiConfig } from "../../config/ApiConfig";
import { useGotItAccount } from "../../hook/useGotItAccount";
import { useTransactionStatistics } from "../../hook/useTransactionStatistics";
import dayjs, { Dayjs } from "dayjs"
import { ProjectData } from "../../config/ProjectFieldsConfig";
import { GotItDeposit, LOW_BALANCE_THRESHOLDS, RECENT_SPEND_DAYS } from "../../config/FinanceConfig";
import { BRAND, getProviderStyle, NEUTRAL, STATUS_TONES } from "../../config/ThemeConfig";
import { ProjectStatistics, TransactionChannel, TransactionStatisticsData } from "../../config/StatisticsConfig";
import { useMetadata } from "../../hook/useMetadata";
import AddIcon from '@mui/icons-material/Add';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { formatDate, formatDateTime, formatMoney, formatNumber } from "../../utils/format";
import TransactionStatisticsPanel from "../../components/TransactionStatisticsPanel";
import SectionCard from "../../components/SectionCard";
import TrendChart from "../../components/Statistics/TrendChart";
import { ChartEmpty } from "../../components/Statistics/chartKit";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n/i18n";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import DetailDrawer from "../../components/DetailDrawer";
import ReusableTable from "../../components/Table/ReusableTable";
import { ColumnFormat } from "../../config/ColumnConfig";
import { useGotItDeposits } from "../../hook/useGotItDeposits";

interface ProviderAccount {
    deposited: number;
    spent: number;
    balance: number;
}

type FinanceTab = "overview" | "analysis" | "exports";

const TABS: FinanceTab[] = ["overview", "analysis", "exports"];

const OVERVIEW_PERIODS = [30, 90, 365] as const;
type OverviewPeriod = (typeof OVERVIEW_PERIODS)[number];

const DATE_PARAM_FORMAT = "YYYY-MM-DD";
const TOP_PROJECTS = 8;

// How long the balance lasts if gifts keep going out as they did over the recent period.
const describeRunway = (balance: number, recentSpend: number | null): { text: string; urgent: boolean } | null => {
    if (recentSpend === null) return null;
    if (recentSpend <= 0) return { text: i18n.t("finance.runway.none", { days: RECENT_SPEND_DAYS }), urgent: false };

    const days = balance / (recentSpend / RECENT_SPEND_DAYS);
    const weeks = days / 7;
    const values = { days: RECENT_SPEND_DAYS, date: formatDate(dayjs().add(Math.floor(days), "day")) };

    if (weeks < 1) return { text: i18n.t("finance.runway.lessThanWeek", values), urgent: true };
    if (weeks > 52) return { text: i18n.t("finance.runway.moreThanYear", values), urgent: false };

    const whole = Math.floor(weeks);
    return { text: i18n.t("finance.runway.weeks", { ...values, count: whole, n: whole }), urgent: weeks < 2 };
};

// Gift value by channel over the most recent days of the loaded series.
const recentSpendByChannel = (statistics: TransactionStatisticsData | null, channel: TransactionChannel): number | null => {
    if (!statistics) return null;

    const since = dayjs().subtract(RECENT_SPEND_DAYS - 1, "day").format(DATE_PARAM_FORMAT);

    return statistics.daily
        .filter((day) => day.date >= since)
        .reduce((sum, day) => sum + (Number(day.amount[channel]) || 0), 0);
};

const ProviderBalanceCard: React.FC<{
    provider: "vinnet" | "gotit";
    account: ProviderAccount;
    loading: boolean;
    recentSpend: number | null;
    footer?: React.ReactNode;
}> = ({ provider, account, loading, recentSpend, footer }) => {
    const { t } = useTranslation();
    const { label, color } = getProviderStyle(provider);
    const threshold = LOW_BALANCE_THRESHOLDS[provider];
    const low = !loading && account.balance < threshold;
    const spentShare = account.deposited > 0 ? Math.min(100, (account.spent / account.deposited) * 100) : 0;
    const runway = loading ? null : describeRunway(account.balance, recentSpend);

    return (
        <StatCard
            label={<ProviderBadge provider={provider} />}
            value={formatMoney(account.balance)}
            tone={low ? "warning" : "default"}
            loading={loading}
            action={low ? <StatusChip label={t("finance.balance.low")} tone="warning" tooltip={t("finance.balance.below", { amount: formatMoney(threshold) })} /> : undefined}
            caption={loading ? undefined : t("finance.balance.caption", { spent: formatMoney(account.spent), deposited: formatMoney(account.deposited) })}
        >
            <LinearProgress
                variant="determinate"
                value={spentShare}
                aria-label={t("finance.balance.share", { provider: label })}
                sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: NEUTRAL[100], "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 } }}
            />
            {runway && (
                <Typography variant="body2" sx={{ mt: 1, color: runway.urgent ? STATUS_TONES.warning.fg : "text.secondary", fontWeight: runway.urgent ? 600 : 400 }}>
                    {runway.text}
                </Typography>
            )}
            {footer && <Box sx={{ mt: 2 }}>{footer}</Box>}
        </StatCard>
    );
};

const TopProjects: React.FC<{ projects: ProjectStatistics[]; period: string; onSelect: (projectId: number) => void }> = ({ projects, period, onSelect }) => {
    const { t } = useTranslation();
    const top = [...projects].filter((project) => project.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, TOP_PROJECTS);
    const max = Math.max(1, ...top.map((project) => project.amount));

    return (
        <SectionCard title={t("finance.topProjects.title")} description={t("finance.topProjects.description", { period })}>
            {top.length === 0 ? <ChartEmpty height={200} text={t("finance.topProjects.empty")} /> : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                    {top.map((project) => (
                        <ButtonBase
                            key={project.project_id}
                            onClick={() => onSelect(project.project_id)}
                            aria-label={t("finance.topProjects.aria", { code: project.internal_code ?? "", name: project.project_name ?? "", amount: formatMoney(project.amount), gifts: formatNumber(project.gifts) })}
                            sx={{
                                display: "block",
                                width: "100%",
                                px: 1,
                                py: 0.75,
                                borderRadius: "8px",
                                textAlign: "left",
                                "&:hover": { bgcolor: NEUTRAL[50] },
                                "&.Mui-focusVisible": { outline: `2px solid ${BRAND.accent}`, outlineOffset: -2 },
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1.5 }}>
                                <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                                    <Box component="span" sx={{ fontWeight: 600 }}>{project.internal_code}</Box>
                                    <Box component="span" sx={{ color: "text.secondary" }}> · {project.project_name}</Box>
                                </Typography>
                                <Typography variant="body2" sx={{ flexShrink: 0, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                                    {formatMoney(project.amount)}
                                </Typography>
                            </Box>
                            <Box sx={{ height: 8, mt: 0.5 }}>
                                <Box sx={{ height: "100%", width: `max(2px, ${(project.amount / max) * 100}%)`, borderRadius: "0 4px 4px 0", bgcolor: BRAND.accent }} />
                            </Box>
                        </ButtonBase>
                    ))}
                </Box>
            )}
        </SectionCard>
    );
};

const Transactions = () => {
    const { loading: vinnetLoading, vinnetAccount } = useVinnetAccount();
    const { gotitAccount, addDeposit, loading: gotitLoading } = useGotItAccount('gotit');
    const [ searchParams, setSearchParams ] = useSearchParams();
    const tabParam = searchParams.get("tab");
    const tab: FinanceTab = TABS.find((item) => item === tabParam) ?? "overview";
    const { t } = useTranslation();

    const [ overviewDays, setOverviewDays ] = useState<OverviewPeriod>(90);
    const overviewFrom = dayjs().subtract(overviewDays - 1, "day").format(DATE_PARAM_FORMAT);
    const overviewTo = dayjs().format(DATE_PARAM_FORMAT);
    const { statistics: overview, actionState: overviewState } = useTransactionStatistics(0, { dateFrom: overviewFrom, dateTo: overviewTo });
    const { showToast } = useToast();
    const [ open, setOpen ] = useState(false);
    const [ amount, setAmount ] = useState("");
    const [ note, setNote ] = useState("");
    const [ depositError, setDepositError ] = useState<string | null>(null);
    const [ historyOpen, setHistoryOpen ] = useState(false);
    const {
        deposits,
        actionState: depositsState,
        total: depositsTotal,
        page: depositsPage,
        setPage: setDepositsPage,
        rowsPerPage: depositsRowsPerPage,
        setRowsPerPage: setDepositsRowsPerPage,
    } = useGotItDeposits('gotit', historyOpen);

    const [ fromDate, setFromDate ] = useState<Dayjs | null>(null);
    const [ toDate, setToDate ] = useState<Dayjs | null>(null);

    const [ loadingExport, setLoadingExport ] = useState<boolean>(false);
    const [ loadingExportByProjects, setLoadingExportByProjects ] = useState<boolean>(false);

    const { data } = useMetadata();

    const [ selectedProjects, setSelectedProjects ] = useState<ProjectData[]>([]);

    const [ exportError, setExportError ] = useState<string>("");

    const projectParam = Number(searchParams.get("project")) || 0;
    const statsProject = (data.projects || []).find((project: ProjectData) => project.id === projectParam) ?? null;

    // Each tab starts clean; the Analysis filters only travel with a link into that tab.
    const openTab = (next: FinanceTab, params: Record<string, string> = {}) =>
        setSearchParams(next === "overview" ? params : { tab: next, ...params });

    const setStatsProject = (project: ProjectData | null) => setSearchParams((previous) => {
        const next = new URLSearchParams(previous);

        if (project) next.set("project", String(project.id));
        else next.delete("project");

        return next;
    }, { replace: true });

    const token = localStorage.getItem("authToken");

    const openDepositDialog = () => {
        setAmount("");
        setNote("");
        setDepositError(null);
        setOpen(true);
    }

    const handleAddDeposit = async () => {
        const saved = await addDeposit(amount, note);

        if (!saved) {
            setDepositError(t("finance.deposit.notSaved"));
            return;
        }

        setOpen(false);
        showToast(t("finance.deposit.added", { amount: formatMoney(amount) }));
    }

    const depositColumns: ColumnFormat[] = [
        {
            label: t("finance.depositHistory.time"),
            name: "created_at",
            type: "date",
            width: 160,
            renderCell: (row: GotItDeposit) => formatDateTime(row.created_at)
        },
        {
            label: t("finance.depositHistory.amount"),
            name: "amount",
            type: "number",
            width: 150,
            align: "right",
            renderCell: (row: GotItDeposit) => formatMoney(row.amount)
        },
        {
            label: t("finance.depositHistory.by"),
            name: "created_by",
            type: "string",
            flex: 1,
            renderCell: (row: GotItDeposit) => row.created_by ? (
                <Tooltip title={row.created_by_email ?? ""}>
                    <span>{row.created_by}</span>
                </Tooltip>
            ) : (
                <Tooltip title={t("finance.depositHistory.notRecordedHint")}>
                    <Box component="span" sx={{ color: "text.secondary" }}>{t("finance.depositHistory.notRecorded")}</Box>
                </Tooltip>
            )
        },
        {
            label: t("finance.depositHistory.note"),
            name: "note",
            type: "string",
            flex: 1.5,
            renderCell: (row: GotItDeposit) => row.note ?? "—"
        }
    ];

    const depositAmount = Number(amount);
    const isDepositInvalid = !amount || !Number.isFinite(depositAmount) || depositAmount <= 0;

    const saveBlob = (data: Blob, fileName: string) => {
        const url = window.URL.createObjectURL(new Blob([data]));
        const link = document.createElement("a");

        link.href = url;
        link.setAttribute("download", fileName);

        document.body.appendChild(link);
        link.click();

        link.remove();
        window.URL.revokeObjectURL(url);
    }

    // With responseType 'blob' the server's JSON error arrives as a Blob and has to be read back as text.
    const getExportErrorMessage = async (error: unknown): Promise<string> => {
        if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
            try {
                const body = JSON.parse(await error.response.data.text());
                return body.message || error.message;
            } catch {
                return error.message;
            }
        }

        return error instanceof Error ? error.message : String(error);
    }

    const handleExport = async () => {
        if(!fromDate || !toDate) return;

        try{
            setLoadingExport(true);
            setExportError("");

            const from_date = fromDate.startOf('day').format('YYYY-MM-DD HH:mm:ss');
            const to_date = toDate.endOf('day').format('YYYY-MM-DD HH:mm:ss');

            const response = await axios.get(ApiConfig.functions.exportTransactions, {
                params: {
                    from_date: from_date,
                    to_date: to_date
                },
                responseType: 'blob',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            saveBlob(response.data, `transactions_${fromDate.format("YYYYMMDD")}_to_${toDate.format("YYYYMMDD")}.xlsx`);
        }catch(error){
            console.error("Export failed", error);
            setExportError(t("finance.export.failed", { error: await getExportErrorMessage(error) }));
        } finally{
            setLoadingExport(false);
        }
    }

    const handleExportExcelByProjects = async () => {
        try
        {
            setLoadingExportByProjects(true);
            setExportError("");

            const project_ids = selectedProjects.map((p) => p.id);

            const response = await axios.get(ApiConfig.functions.exportTransactionsByProjecs, {
                params: {
                    project_ids: project_ids
                },
                responseType: 'blob',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            saveBlob(response.data, "transactions.xlsx");
        }catch(error){
            console.error("Export failed", error);
            setExportError(t("finance.export.failed", { error: await getExportErrorMessage(error) }));
        } finally{
            setLoadingExportByProjects(false);
        }
    }

    const recentSpend = (channel: "vinnet" | "gotit") => recentSpendByChannel(overview, channel);
    const overviewPeriod = t(`finance.periods.${overviewDays}`);

    const projectLabel = (option: ProjectData) => `${option.internal_code} - ${option.project_name}`;

    return (
        <>
            <PageHeader
                title={t("finance.title")}
                description={t("finance.description")}
            />

            <Tabs
                value={tab}
                onChange={(_event, value: FinanceTab) => openTab(value)}
                aria-label={t("finance.sections")}
                sx={{ mb: 2.5, minHeight: 40, borderBottom: 1, borderColor: "divider" }}
            >
                {TABS.map((item) => (
                    <Tab key={item} value={item} label={t(`finance.tabs.${item}`)} sx={{ minHeight: 40, typography: "body2", fontWeight: 500 }} />
                ))}
            </Tabs>

            {tab === "overview" && (
                <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <ProviderBalanceCard
                            provider="vinnet"
                            account={vinnetAccount}
                            loading={vinnetLoading}
                            recentSpend={recentSpend("vinnet")}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <ProviderBalanceCard
                            provider="gotit"
                            account={gotitAccount}
                            loading={gotitLoading}
                            recentSpend={recentSpend("gotit")}
                            footer={
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                    <Button variant="outlined" color="inherit" size="small" startIcon={<AddIcon />} onClick={openDepositDialog}>
                                        {t("finance.balance.addDeposit")}
                                    </Button>
                                    <Button color="inherit" size="small" startIcon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)}>
                                        {t("finance.balance.depositHistory")}
                                    </Button>
                                </Box>
                            }
                        />
                    </Grid>

                    <Grid size={12}>
                        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>{t("finance.spendingOver")}</Typography>
                            <ToggleButtonGroup
                                exclusive
                                size="small"
                                value={overviewDays}
                                onChange={(_event, value: OverviewPeriod | null) => value && setOverviewDays(value)}
                                aria-label={t("finance.periodLabel")}
                            >
                                {OVERVIEW_PERIODS.map((period) => (
                                    <ToggleButton key={period} value={period} sx={{ px: 1.25, py: 0.25, textTransform: "none", typography: "body2" }}>
                                        {t(`finance.periods.${period}`)}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </Box>
                    </Grid>

                    {overviewState.error && (
                        <Grid size={12}>
                            <Alert severity="error">{overviewState.message}</Alert>
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, lg: 7 }} sx={{ opacity: overviewState.loading && overview ? 0.6 : 1, transition: "opacity 0.15s" }}>
                        <TrendChart
                            title={t("finance.giftsPaid")}
                            daily={overview?.daily ?? []}
                            dateFrom={overviewFrom}
                            dateTo={overviewTo}
                            metrics={["amount", "gifts"]}
                            onSelectRange={(from, to) => openTab("analysis", { from: from.format(DATE_PARAM_FORMAT), to: to.format(DATE_PARAM_FORMAT) })}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, lg: 5 }} sx={{ opacity: overviewState.loading && overview ? 0.6 : 1, transition: "opacity 0.15s" }}>
                        <TopProjects
                            projects={overview?.by_project ?? []}
                            period={overviewPeriod}
                            onSelect={(projectId) => openTab("analysis", { project: String(projectId), from: overviewFrom, to: overviewTo })}
                        />
                    </Grid>
                </Grid>
            )}

            {tab === "analysis" && (
                <TransactionStatisticsPanel
                    projectId={statsProject?.id ?? 0}
                    defaultDays={RECENT_SPEND_DAYS}
                    onSelectProject={(projectId) => setStatsProject((data.projects || []).find((project: ProjectData) => project.id === projectId) ?? null)}
                    leading={
                        <Autocomplete
                            options={data.projects || []}
                            value={statsProject}
                            onChange={(_event, newValue) => setStatsProject(newValue)}
                            getOptionLabel={projectLabel}
                            renderInput={(params) => (
                                <TextField {...params} size="small" label={t("finance.project")} placeholder={t("finance.allProjects")}
                                    slotProps={{ ...params.slotProps, inputLabel: { ...params.slotProps.inputLabel, shrink: true } }}
                                />
                            )}
                            sx={{ width: { xs: "100%", sm: 320 }, bgcolor: "background.paper" }}
                        />
                    }
                />
            )}

            {tab === "exports" && (
                <SectionCard title={t("finance.export.title")} description={t("finance.export.description")}>
                    {exportError && (
                        <Alert severity="error" onClose={() => setExportError("")} sx={{ mb: 2 }}>
                            {exportError}
                        </Alert>
                    )}
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>{t("finance.export.byDate")}</Typography>
                            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
                                <DateRangeField
                                    label={t("finance.export.dates")}
                                    from={fromDate}
                                    to={toDate}
                                    onChange={(from, to) => {
                                        setFromDate(from);
                                        setToDate(to);
                                    }}
                                />
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    startIcon={<FileDownloadOutlinedIcon />}
                                    loading={loadingExport}
                                    loadingPosition="start"
                                    disabled={!fromDate || !toDate}
                                    onClick={handleExport}
                                >
                                    {t("finance.export.button")}
                                </Button>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 7 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>{t("finance.export.byProject")}</Typography>
                            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                                <Autocomplete
                                    multiple
                                    disableCloseOnSelect
                                    limitTags={2}
                                    options={data.projects || []}
                                    value={selectedProjects}
                                    onChange={(_event, newValue) => setSelectedProjects(newValue)}
                                    getOptionLabel={projectLabel}
                                    renderOption={(props, option, { selected }) => (
                                        <li {...props}>
                                            <Checkbox size="small" sx={{ mr: 1 }} checked={selected} />
                                            {projectLabel(option)}
                                        </li>
                                    )}
                                    renderInput={(params) => (
                                        <TextField {...params} size="small" label={t("finance.export.projects")} placeholder={selectedProjects.length ? "" : t("finance.export.chooseProjects")} />
                                    )}
                                    sx={{ flex: 1, minWidth: 0 }}
                                />
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    startIcon={<FileDownloadOutlinedIcon />}
                                    loading={loadingExportByProjects}
                                    loadingPosition="start"
                                    disabled={selectedProjects.length === 0}
                                    onClick={handleExportExcelByProjects}
                                    sx={{ flexShrink: 0 }}
                                >
                                    {t("finance.export.button")}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </SectionCard>
            )}

            <FormDialog
                open={open}
                title={t("finance.deposit.title")}
                description={t("finance.deposit.description")}
                error={depositError}
                onClose={() => setOpen(false)}
                onSubmit={handleAddDeposit}
                submitText={t("finance.deposit.submit")}
                submitDisabled={isDepositInvalid}
                loading={gotitLoading}
                maxWidth="xs"
            >
                <TextField
                    autoFocus
                    size="small"
                    label={t("finance.deposit.amount")}
                    type="number"
                    fullWidth
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    helperText={!isDepositInvalid ? formatMoney(depositAmount) : " "}
                    slotProps={{ htmlInput: { min: 1, step: 1000 } }}
                />
                <TextField
                    size="small"
                    label={t("finance.deposit.note")}
                    fullWidth
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    helperText={t("finance.deposit.noteHelp")}
                    slotProps={{ htmlInput: { maxLength: 255 } }}
                    sx={{ mt: 2 }}
                />
            </FormDialog>

            <DetailDrawer
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                title={t("finance.depositHistory.title")}
                subtitle={t("finance.depositHistory.subtitle")}
                width={760}
            >
                <ReusableTable
                    columns={depositColumns}
                    data={deposits}
                    actionStatus={depositsState}
                    page={depositsPage}
                    rowsPerPage={depositsRowsPerPage}
                    total={depositsTotal}
                    onPageChange={(_event, newPage) => setDepositsPage(newPage)}
                    onRowsPerPageChange={(event) => {
                        setDepositsRowsPerPage(parseInt(event.target.value, 10));
                        setDepositsPage(0);
                    }}
                    emptyText={t("finance.depositHistory.empty")}
                    inset={false}
                    dense
                />
            </DetailDrawer>
        </>
    );
}

export default Transactions;
