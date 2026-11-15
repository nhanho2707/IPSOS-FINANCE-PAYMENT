import { Alert, Autocomplete, Box, Button, ButtonBase, Checkbox, Grid, LinearProgress, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
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
import { LOW_BALANCE_THRESHOLDS, RECENT_SPEND_DAYS } from "../../config/FinanceConfig";
import { BRAND, getProviderStyle, NEUTRAL, STATUS_TONES } from "../../config/ThemeConfig";
import { ProjectStatistics, TransactionChannel, TransactionStatisticsData } from "../../config/StatisticsConfig";
import { useMetadata } from "../../hook/useMetadata";
import AddIcon from '@mui/icons-material/Add';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { formatDate, formatMoney, formatNumber } from "../../utils/format";
import TransactionStatisticsPanel from "../../components/TransactionStatisticsPanel";
import SectionCard from "../../components/SectionCard";
import TrendChart from "../../components/Statistics/TrendChart";
import { ChartEmpty } from "../../components/Statistics/chartKit";

interface ProviderAccount {
    deposited: number;
    spent: number;
    balance: number;
}

type FinanceTab = "overview" | "analysis" | "exports";

const TABS: { value: FinanceTab; label: string }[] = [
    { value: "overview", label: "Overview" },
    { value: "analysis", label: "Analysis" },
    { value: "exports", label: "Exports" },
];

const OVERVIEW_PERIODS = [
    { days: 30, label: "30 days" },
    { days: 90, label: "90 days" },
    { days: 365, label: "12 months" },
];

const DATE_PARAM_FORMAT = "YYYY-MM-DD";
const TOP_PROJECTS = 8;

// How long the balance lasts if gifts keep going out as they did over the recent period.
const describeRunway = (balance: number, recentSpend: number | null): { text: string; urgent: boolean } | null => {
    if (recentSpend === null) return null;
    if (recentSpend <= 0) return { text: `No gifts paid in the last ${RECENT_SPEND_DAYS} days.`, urgent: false };

    const days = balance / (recentSpend / RECENT_SPEND_DAYS);
    const weeks = days / 7;
    const basis = `at the last ${RECENT_SPEND_DAYS} days' spending`;
    const runsOut = ` Runs out around ${formatDate(dayjs().add(Math.floor(days), "day"))}.`;

    if (weeks < 1) return { text: `Less than a week left ${basis}.${runsOut}`, urgent: true };
    if (weeks > 52) return { text: `More than a year left ${basis}.`, urgent: false };

    const whole = Math.floor(weeks);
    return { text: `About ${whole} week${whole === 1 ? "" : "s"} left ${basis}.${runsOut}`, urgent: weeks < 2 };
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
            action={low ? <StatusChip label="Low balance" tone="warning" tooltip={`Below ${formatMoney(threshold)}`} /> : undefined}
            caption={loading ? undefined : `Balance · spent ${formatMoney(account.spent)} of ${formatMoney(account.deposited)} deposited`}
        >
            <LinearProgress
                variant="determinate"
                value={spentShare}
                aria-label={`${label} share of deposits spent`}
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
    const top = [...projects].filter((project) => project.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, TOP_PROJECTS);
    const max = Math.max(1, ...top.map((project) => project.amount));

    return (
        <SectionCard title="Top projects" description={`By gift value, last ${period}. Pick one to analyse it.`}>
            {top.length === 0 ? <ChartEmpty height={200} text="No gifts paid in this period" /> : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                    {top.map((project) => (
                        <ButtonBase
                            key={project.project_id}
                            onClick={() => onSelect(project.project_id)}
                            aria-label={`${project.internal_code ?? ""} ${project.project_name ?? ""}: ${formatMoney(project.amount)}, ${formatNumber(project.gifts)} gifts`}
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
    const tab: FinanceTab = TABS.some((item) => item.value === tabParam) ? (tabParam as FinanceTab) : "overview";

    const [ overviewDays, setOverviewDays ] = useState(90);
    const overviewFrom = dayjs().subtract(overviewDays - 1, "day").format(DATE_PARAM_FORMAT);
    const overviewTo = dayjs().format(DATE_PARAM_FORMAT);
    const { statistics: overview, actionState: overviewState } = useTransactionStatistics(0, { dateFrom: overviewFrom, dateTo: overviewTo });
    const { showToast } = useToast();
    const [ open, setOpen ] = useState(false);
    const [ amount, setAmount ] = useState("");
    const [ depositError, setDepositError ] = useState<string | null>(null);

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
        setDepositError(null);
        setOpen(true);
    }

    const handleAddDeposit = async () => {
        const saved = await addDeposit(amount);

        if (!saved) {
            setDepositError("The deposit was not saved. Check the amount and try again.");
            return;
        }

        setOpen(false);
        showToast(`Deposit of ${formatMoney(amount)} added to the GotIt account.`);
    }

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
            setExportError(`Export failed: ${await getExportErrorMessage(error)}`);
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
            setExportError(`Export failed: ${await getExportErrorMessage(error)}`);
        } finally{
            setLoadingExportByProjects(false);
        }
    }

    const recentSpend = (channel: "vinnet" | "gotit") => recentSpendByChannel(overview, channel);
    const overviewPeriod = OVERVIEW_PERIODS.find((period) => period.days === overviewDays)?.label ?? `${overviewDays} days`;

    const projectLabel = (option: ProjectData) => `${option.internal_code} - ${option.project_name}`;

    return (
        <>
            <PageHeader
                title="Finance"
                description="Provider balances, spending and interview analysis, and transaction exports."
            />

            <Tabs
                value={tab}
                onChange={(_event, value: FinanceTab) => openTab(value)}
                aria-label="Finance sections"
                sx={{ mb: 2.5, minHeight: 40, borderBottom: 1, borderColor: "divider" }}
            >
                {TABS.map((item) => (
                    <Tab key={item.value} value={item.value} label={item.label} sx={{ minHeight: 40, typography: "body2", fontWeight: 500 }} />
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
                                <Button variant="outlined" color="inherit" size="small" startIcon={<AddIcon />} onClick={openDepositDialog}>
                                    Add deposit
                                </Button>
                            }
                        />
                    </Grid>

                    <Grid size={12}>
                        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>Spending over the last</Typography>
                            <ToggleButtonGroup
                                exclusive
                                size="small"
                                value={overviewDays}
                                onChange={(_event, value: number | null) => value && setOverviewDays(value)}
                                aria-label="Period"
                            >
                                {OVERVIEW_PERIODS.map((period) => (
                                    <ToggleButton key={period.days} value={period.days} sx={{ px: 1.25, py: 0.25, textTransform: "none", typography: "body2" }}>
                                        {period.label}
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
                            title="Gifts paid"
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
                                <TextField {...params} size="small" label="Project" placeholder="All projects"
                                    slotProps={{ ...params.slotProps, inputLabel: { ...params.slotProps.inputLabel, shrink: true } }}
                                />
                            )}
                            sx={{ width: { xs: "100%", sm: 320 }, bgcolor: "background.paper" }}
                        />
                    }
                />
            )}

            {tab === "exports" && (
                <SectionCard title="Export transactions" description="Excel files for reconciliation, by date or by project.">
                    {exportError && (
                        <Alert severity="error" onClose={() => setExportError("")} sx={{ mb: 2 }}>
                            {exportError}
                        </Alert>
                    )}
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>By date</Typography>
                            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
                                <DateRangeField
                                    label="Dates"
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
                                    Export
                                </Button>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 7 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>By project</Typography>
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
                                        <TextField {...params} size="small" label="Projects" placeholder={selectedProjects.length ? "" : "Choose projects"} />
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
                                    Export
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </SectionCard>
            )}

            <FormDialog
                open={open}
                title="Add GotIt deposit"
                description="Record money transferred to the GotIt account. The balance updates right away."
                error={depositError}
                onClose={() => setOpen(false)}
                onSubmit={handleAddDeposit}
                submitText="Add deposit"
                submitDisabled={isDepositInvalid}
                loading={gotitLoading}
                maxWidth="xs"
            >
                <TextField
                    autoFocus
                    size="small"
                    label="Amount (VND)"
                    type="number"
                    fullWidth
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    helperText={!isDepositInvalid ? formatMoney(depositAmount) : " "}
                    slotProps={{ htmlInput: { min: 1, step: 1000 } }}
                />
            </FormDialog>
        </>
    );
}

export default Transactions;
