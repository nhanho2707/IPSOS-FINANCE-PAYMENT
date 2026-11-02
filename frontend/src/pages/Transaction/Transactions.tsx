import { Alert, Autocomplete, Box, Button, Checkbox, Grid, LinearProgress, Paper, TextField, Typography } from "@mui/material";
import { useVinnetAccount } from "../../hook/useVinnetAccount";
import FormDialog from "../../components/Dialogs/FormDialog";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import StatusChip from "../../components/StatusChip";
import ProviderBadge from "../../components/ProviderBadge";
import DateRangeField from "../../components/DateRangeField";
import { useToast } from "../../contexts/ToastContext";
import React, { useState } from "react";
import axios from "axios";
import { ApiConfig } from "../../config/ApiConfig";
import { useGotItAccount } from "../../hook/useGotItAccount";
import { useTransactionStatistics } from "../../hook/useTransactionStatistics";
import dayjs, { Dayjs } from "dayjs"
import { ProjectData } from "../../config/ProjectFieldsConfig";
import { LOW_BALANCE_THRESHOLDS, RECENT_SPEND_DAYS } from "../../config/FinanceConfig";
import { getProviderStyle, NEUTRAL, STATUS_TONES } from "../../config/ThemeConfig";
import { useMetadata } from "../../hook/useMetadata";
import AddIcon from '@mui/icons-material/Add';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { formatMoney } from "../../utils/format";
import TransactionStatisticsPanel from "../../components/TransactionStatisticsPanel";

interface ProviderAccount {
    deposited: number;
    spent: number;
    balance: number;
}

// How long the balance lasts if gifts keep going out as they did over the recent period.
const describeRunway = (balance: number, recentSpend: number | null): { text: string; urgent: boolean } | null => {
    if (recentSpend === null) return null;
    if (recentSpend <= 0) return { text: `No gifts paid in the last ${RECENT_SPEND_DAYS} days.`, urgent: false };

    const weeks = balance / ((recentSpend / RECENT_SPEND_DAYS) * 7);
    const basis = `at the last ${RECENT_SPEND_DAYS} days' spending`;

    if (weeks < 1) return { text: `Less than a week left ${basis}.`, urgent: true };
    if (weeks > 52) return { text: `More than a year left ${basis}.`, urgent: false };

    const whole = Math.floor(weeks);
    return { text: `About ${whole} week${whole === 1 ? "" : "s"} left ${basis}.`, urgent: weeks < 2 };
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

const SectionCard: React.FC<{ title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, description, action, children }) => (
    <Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: "12px", bgcolor: "background.paper" }}>
        <Box sx={{ display: "flex", alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" }, gap: 1.5, justifyContent: "space-between", px: 2.5, py: 1.75, borderBottom: 1, borderColor: "divider" }}>
            <Box>
                <Typography variant="h2" component="h2">{title}</Typography>
                {description && <Typography variant="body2" sx={{ color: "text.secondary" }}>{description}</Typography>}
            </Box>
            {action}
        </Box>
        <Box sx={{ p: 2.5 }}>{children}</Box>
    </Paper>
);

const Transactions = () => {
    const { loading: vinnetLoading, vinnetAccount } = useVinnetAccount();
    const { gotitAccount, addDeposit, loading: gotitLoading } = useGotItAccount('gotit');
    const { statistics: recentStatistics } = useTransactionStatistics(0, {
        dateFrom: dayjs().subtract(RECENT_SPEND_DAYS - 1, "day").format("YYYY-MM-DD"),
        dateTo: dayjs().format("YYYY-MM-DD"),
    });
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

    const [ statsProject, setStatsProject ] = useState<ProjectData | null>(null);

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

    const recentSpend = (channel: "vinnet" | "gotit") =>
        recentStatistics ? recentStatistics.by_channel?.[channel]?.amount ?? 0 : null;

    const projectLabel = (option: ProjectData) => `${option.internal_code} - ${option.project_name}`;

    return (
        <>
            <PageHeader
                title="Finance"
                description="Provider balances, GotIt deposits and transaction exports."
            />

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
                </Grid>

                <Grid size={12}>
                    <SectionCard
                        title="Interview & gift timing"
                        description="When interviews happen and how long respondents wait for their gift."
                        action={
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
                                sx={{ width: { xs: "100%", sm: 360 } }}
                            />
                        }
                    >
                        <TransactionStatisticsPanel projectId={statsProject?.id ?? 0} />
                    </SectionCard>
                </Grid>
            </Grid>

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
