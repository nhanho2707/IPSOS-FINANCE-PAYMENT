import { Alert, AlertTitle, Box, Button, Checkbox, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { GiftStatus, OFFLINE_RESPONDENT_IMPORT_COLUMNS, OfflineGiftBulkSendResult, OfflineProjectRespondentData, OfflineProjectRespondentImportData, toImportRow } from "../../config/OfflineProjectRespondentFieldsConfig";
import { ColumnFormat } from "../../config/ColumnConfig";
import ResourceTable from "../../components/Table/ResourceTable";
import CellStack from "../../components/Table/CellStack";
import ProviderBadge from "../../components/ProviderBadge";
import RowActions from "../../components/Table/RowActions";
import BulkActionBar from "../../components/Table/BulkActionBar";
import EmptyState from "../../components/EmptyState";
import ProjectPageActions from "../../components/ProjectPageActions";
import * as XLSX from "xlsx";
import ConfirmDialog from "../../components/Dialogs/ConfirmDialog";
import useDialog from "../../hook/useDialog";
import { useProjectContext } from "../../hook/useProjectContext";
import { MAX_CONSECUTIVE_GIFT_FAILURES, useOfflineProjectRespondents } from "../../hook/useOfflineProjectRespondents";
import { DeleteOutlineOutlined, FileUploadOutlined, StopCircleOutlined } from "@mui/icons-material";
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import StatusChip from "../../components/StatusChip";
import { getStatusTone, TRANSACTION_STATUS_TONE } from "../../config/ThemeConfig";
import { useToast } from "../../contexts/ToastContext";
import { formatMoney, formatNumber, formatPhone } from "../../utils/format";

const MAX_FAILURES_SHOWN = 30;

const GIFT_STATUS_LABELS: Record<GiftStatus, string> = {
    pending: "Pending",
    success: "Sent",
    failed: "Failed",
    refused: "Refused",
};

const GIFT_TABS: { value: GiftStatus | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: GIFT_STATUS_LABELS.pending },
    { value: "success", label: GIFT_STATUS_LABELS.success },
    { value: "failed", label: GIFT_STATUS_LABELS.failed },
    { value: "refused", label: GIFT_STATUS_LABELS.refused },
];

const EMPTY_TAB_TITLES: Record<GiftStatus, string> = {
    pending: "No gifts waiting to be sent",
    success: "No gifts sent yet",
    failed: "No failed gifts",
    refused: "No refused gifts",
};

interface BulkSendProgress {
    done: number,
    total: number,
    success: number,
    failed: number
};

interface BulkSendOutcome {
    result: OfflineGiftBulkSendResult,
    total: number
};

const plural = (count: number, one: string, other: string) => `${formatNumber(count)} ${count === 1 ? one : other}`;

const BulkSendResultBanner: React.FC<{ outcome: BulkSendOutcome; onClose: () => void }> = ({ outcome, onClose }) => {
    const { result: { results, stoppedOnFailures }, total } = outcome;
    const failures = results.filter(r => !r.success);
    const successCount = results.length - failures.length;
    const notSent = total - results.length;
    const severity = failures.length === 0 && notSent === 0 ? "success" : successCount === 0 ? "error" : "warning";

    return (
        <Alert severity={severity} onClose={onClose}>
            <AlertTitle>Sent {formatNumber(successCount)} of {plural(total, "gift", "gifts")}</AlertTitle>
            {stoppedOnFailures && (
                <Typography variant="body2">
                    Sending stopped after {MAX_CONSECUTIVE_GIFT_FAILURES} failures in a row, so {plural(notSent, "respondent was", "respondents were")} not sent.
                    Check the cause (for example the account balance) before sending again.
                </Typography>
            )}
            {!stoppedOnFailures && notSent > 0 && (
                <Typography variant="body2">
                    You stopped the run; {plural(notSent, "respondent was", "respondents were")} not sent.
                </Typography>
            )}
            {failures.length > 0 && (
                <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5, typography: "body2" }}>
                    {failures.slice(0, MAX_FAILURES_SHOWN).map(f => (
                        <li key={f.row.id}>{f.row.respondent_id} ({f.row.phone_number}): {f.message || "Failed"}</li>
                    ))}
                    {failures.length > MAX_FAILURES_SHOWN && (
                        <li>…and {plural(failures.length - MAX_FAILURES_SHOWN, "more failure", "more failures")}</li>
                    )}
                </Box>
            )}
        </Alert>
    );
};

const Gifts: React.FC = () => {
    const { projectId } = useProjectContext();
    const { showToast } = useToast();

    const { openDialog, closeDialog, dialogProps } = useDialog();

    const { offineProjectRespondents, removeProjectRespondent, offlineTransactionSending, bulkOfflineTransactionSending, fetchAllPendingProjectRespondents, importOfflineProjectRespondents, loading: loadingOfflineProjectRespondents, error: errorOfflineProjectRespondents, message: messageOfflineProjectRespondents, page, rowsPerPage, searchTerm, total, setSearchTerm, setPage, setRowsPerPage, statusFilter, setStatusFilter, statusCounts } = useOfflineProjectRespondents(projectId);
    const [ loadingRowId, setLoadingRowId ] = useState<string | null>(null);

    const [ selectedRows, setSelectedRows ] = useState<Record<number, OfflineProjectRespondentData>>({});
    const [ loadingSelectAllPending, setLoadingSelectAllPending ] = useState<boolean>(false);
    const [ bulkProgress, setBulkProgress ] = useState<BulkSendProgress | null>(null);
    const [ bulkOutcome, setBulkOutcome ] = useState<BulkSendOutcome | null>(null);
    const [ stopRequested, setStopRequested ] = useState<boolean>(false);
    const stopBulkRef = useRef<boolean>(false);

    const selectedCount = Object.keys(selectedRows).length;
    const bulkSending = bulkProgress !== null;
    const pendingRowsOnPage = offineProjectRespondents.filter(r => r.status === 'pending');
    const selectedOnPageCount = pendingRowsOnPage.filter(r => selectedRows[r.id]).length;

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Rows sent one by one (or changed elsewhere) must not be sent again by the next bulk run.
    useEffect(() => {
        const notPendingIds = offineProjectRespondents.filter(r => r.status !== 'pending').map(r => r.id);

        if (notPendingIds.length === 0) return;

        setSelectedRows(prev => {
            if (!notPendingIds.some(id => prev[id])) return prev;

            const next = { ...prev };
            notPendingIds.forEach(id => delete next[id]);
            return next;
        });
    }, [offineProjectRespondents]);

    const handleRemoveConfirmDialog = async (row: OfflineProjectRespondentData) => {
        try{
            await removeProjectRespondent(projectId, row);
        } catch(error){
            console.error('Failed to remove respondent', error);
        }finally{
            closeDialog();
        }
    }

    const handleRemoveClick = (row: OfflineProjectRespondentData) => {
        openDialog({
            title: "Remove respondent",
            tone: "danger",
            confirmText: "Remove",
            message: `Remove ${row.respondent_id} from this project? Their gift has not been sent yet.`,
            showConfirmButton: true,
            onConfirm: () => handleRemoveConfirmDialog(row)
        });
    }

    const handleSendGiftClick = async (row: OfflineProjectRespondentData) => {
        try
        {
            setLoadingRowId(row.respondent_id);
            await offlineTransactionSending(projectId, row);
        }catch(error){
            console.error('Failed to send gift', error);
        } finally {
            setLoadingRowId(null);
        }
    }

    const handleToggleRow = (row: OfflineProjectRespondentData) => {
        setSelectedRows(prev => {
            const next = { ...prev };

            if (next[row.id]) {
                delete next[row.id];
            } else {
                next[row.id] = row;
            }

            return next;
        });
    }

    const handleTogglePage = () => {
        const allSelected = pendingRowsOnPage.length > 0 && selectedOnPageCount === pendingRowsOnPage.length;

        setSelectedRows(prev => {
            const next = { ...prev };

            pendingRowsOnPage.forEach(r => {
                if (allSelected) {
                    delete next[r.id];
                } else {
                    next[r.id] = r;
                }
            });

            return next;
        });
    }

    const handleSelectAllPending = async () => {
        try
        {
            setLoadingSelectAllPending(true);

            const rows = await fetchAllPendingProjectRespondents();

            setSelectedRows(Object.fromEntries(rows.map(r => [r.id, r])));

            if (rows.length === 0) {
                showToast("No respondents are waiting for a gift.", "info");
            }
        } catch(error){
            console.error('Failed to fetch pending respondents', error);
            showToast("Could not load pending respondents. Please try again.", "error");
        } finally {
            setLoadingSelectAllPending(false);
        }
    }

    const handleBulkSendConfirm = async (rows: OfflineProjectRespondentData[]) => {
        stopBulkRef.current = false;
        setStopRequested(false);
        setBulkOutcome(null);
        setBulkProgress({ done: 0, total: rows.length, success: 0, failed: 0 });

        try
        {
            const bulkResult = await bulkOfflineTransactionSending(
                rows,
                (done, result) => setBulkProgress(prev => prev && ({
                    ...prev,
                    done,
                    success: prev.success + (result.success ? 1 : 0),
                    failed: prev.failed + (result.success ? 0 : 1)
                })),
                () => stopBulkRef.current
            );

            setSelectedRows({});
            setBulkOutcome({ result: bulkResult, total: rows.length });
        } catch(error){
            console.error('Failed to send gifts', error);
            showToast("Sending stopped because of an unexpected error. Check the list before trying again.", "error");
        } finally {
            setBulkProgress(null);
        }
    }

    const handleStopBulkSend = () => {
        stopBulkRef.current = true;
        setStopRequested(true);
    }

    const handleBulkSendClick = () => {
        const rows = Object.values(selectedRows).filter(r => r.status === 'pending');

        if (rows.length === 0) return;

        openDialog({
            title: "Send gifts",
            confirmText: `Send ${plural(rows.length, "gift", "gifts")}`,
            message: `Send gifts to the ${plural(rows.length, "selected respondent", "selected respondents")}? Each gift is charged to the provider account as it is sent.`,
            showConfirmButton: true,
            onConfirm: () => handleBulkSendConfirm(rows)
        });
    }

    const columns: ColumnFormat[] = [
        {
            label: "",
            name: "select",
            type: "boolean",
            align: "center",
            width: 48,
            renderHeader: () => (
                <Checkbox
                    size="small"
                    checked={pendingRowsOnPage.length > 0 && selectedOnPageCount === pendingRowsOnPage.length}
                    indeterminate={selectedOnPageCount > 0 && selectedOnPageCount < pendingRowsOnPage.length}
                    disabled={bulkSending || pendingRowsOnPage.length === 0}
                    onChange={handleTogglePage}
                    slotProps={{ input: { 'aria-label': 'Select pending respondents on this page' } }}
                />
            ),
            renderCell: (row: OfflineProjectRespondentData) => (
                <Checkbox
                    size="small"
                    checked={Boolean(selectedRows[row.id])}
                    disabled={bulkSending || row.status !== 'pending'}
                    onChange={() => handleToggleRow(row)}
                    slotProps={{ input: { 'aria-label': `Select ${row.respondent_id}` } }}
                />
            )
        },
        {
            label: "Respondent",
            name: "respondent_id",
            type: "string",
            flex: 1.8,
            renderCell: (row: OfflineProjectRespondentData) => (
                <CellStack
                    primary={row.respondent_id}
                    secondary={formatPhone(row.phone_number)}
                    title={[
                        row.respondent_id,
                        `Gift phone: ${formatPhone(row.phone_number)}`,
                        row.respondent_phone_number && `Survey phone: ${formatPhone(row.respondent_phone_number)}`,
                        row.email && `Email: ${row.email}`,
                    ].filter(Boolean).join(" · ")}
                    numeric
                />
            )
        },
        {
            label: "Interviewer",
            name: "employee_id",
            type: "string",
            flex: 1.4,
            renderCell: (row: OfflineProjectRespondentData) => (
                <CellStack
                    primary={row.employee_name || row.employee_id}
                    secondary={row.employee_name ? row.employee_id : undefined}
                />
            )
        },
        {
            label: "Province",
            name: "province_name",
            type: "string",
            flex: 1
        },
        {
            label: "Channel",
            name: "channel",
            type: "string",
            width: 96,
            renderCell: (row: OfflineProjectRespondentData) => <ProviderBadge provider={row.channel} />
        },
        {
            label: "Amount",
            name: "price_level",
            type: "number",
            align: "right",
            width: 112,
            renderCell: (row: OfflineProjectRespondentData) => (
                <Box component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(row.price_level)}</Box>
            )
        },
        {
            label: "Status",
            name: "status",
            type: "string",
            width: 176,
            renderCell: (row: OfflineProjectRespondentData) => (
                <Box sx={{ minWidth: 0 }}>
                    <StatusChip
                        label={GIFT_STATUS_LABELS[row.status] ?? row.status}
                        tone={getStatusTone(row.status, TRANSACTION_STATUS_TONE)}
                    />
                    {row.status === "failed" && row.status_label && (
                        <Tooltip title={row.status_label} placement="top-start">
                            <Typography
                                variant="caption"
                                component="div"
                                sx={{ mt: 0.25, color: "error.main", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            >
                                {row.status_label}
                            </Typography>
                        </Tooltip>
                    )}
                </Box>
            )
        },
        {
            label: "",
            name: "actions",
            type: "menu",
            align: "right",
            width: 148,
            renderAction: (row: OfflineProjectRespondentData) => {
                const isPending = row.status === 'pending';

                return (
                    <RowActions
                        menuLabel={`Actions for ${row.respondent_id}`}
                        primary={isPending && (
                            <Button
                                onClick={() => handleSendGiftClick(row)}
                                size="small"
                                startIcon={<CardGiftcardIcon />}
                                loading={loadingRowId === row.respondent_id}
                                loadingPosition="start"
                                variant="outlined"
                                color="inherit"
                                disabled={bulkSending}
                                sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                            >
                                Send gift
                            </Button>
                        )}
                        items={[
                            {
                                label: "Remove respondent",
                                icon: DeleteOutlineOutlined,
                                tone: "danger",
                                onClick: () => handleRemoveClick(row),
                                disabled: !isPending || bulkSending,
                                disabledReason: !isPending ? "Only respondents still waiting for a gift can be removed" : undefined,
                            },
                        ]}
                    />
                )
            }
        }
    ];

    const handleSearchChange = (value: string) => {
        setSearchTerm(value.toLocaleLowerCase());
        setPage(0);
    }

    const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
                defval: ""
            });

            const headers = sheetRows.length ? Object.keys(sheetRows[0]) : [];

            const missingColumns = OFFLINE_RESPONDENT_IMPORT_COLUMNS.filter(
                col => !headers.includes(col)
            );

            if (sheetRows.length && missingColumns.length > 0) {
                showToast(`Import failed: the file is missing these columns: ${missingColumns.join(", ")}.`, "error");
                return;
            }

            // Formatted-but-empty rows at the bottom of a long sheet still come back from sheet_to_json.
            const rows = sheetRows
                .map(toImportRow)
                .filter(row => OFFLINE_RESPONDENT_IMPORT_COLUMNS.some(col => row[col] !== ""));

            if (!rows.length) {
                showToast("Import failed: the file has no respondent rows.", "error");
                return;
            }

            await importRespondents(rows);
        } catch (error) {
            console.error("Import error:", error);
        } finally {
            event.target.value = "";
        }

    };

    const importRespondents = async (rows: OfflineProjectRespondentImportData[]) => {
        const payload = rows.map(r => ({
            instance_id: r.InstanceID,
            shell_chainid: r.Shell_ChainID,
            location_id: r.SamplePoint,
            province_name: r.Province,
            employee_id: r.InterviewerID,
            respondent_phone_number: r.RespondentPhoneNumber,
            phone_number: r.PhoneNumber,
            email: r.Email,
            price_level: r.PriceLevel,
            channel: r.Channel
        }));

        await importOfflineProjectRespondents(payload);
    };

    const openImport = () => fileInputRef.current?.click();

    const selectedTotal = Object.values(selectedRows).reduce((sum, row) => sum + (Number(row.price_level) || 0), 0);

    const showStatus = (value: string) => {
        setStatusFilter(GIFT_TABS.find(tab => tab.value === value)?.value ?? "all");
        setPage(0);
    };

    const allCount = statusCounts ? Object.values(statusCounts).reduce((sum, count) => sum + count, 0) : undefined;
    const failedCount = statusCounts?.failed ?? 0;

    // Exceptions first: failed gifts need someone to look at them, so they are announced above the list.
    const failedBanner = failedCount > 0 && statusFilter !== "failed" ? (
        <Alert
            severity="warning"
            action={<Button color="inherit" size="small" onClick={() => showStatus("failed")}>Show failed</Button>}
        >
            {plural(failedCount, "gift", "gifts")} failed{searchTerm ? " for this search" : ""}. The reason is listed under each one.
        </Alert>
    ) : null;

    const bulkBar = (selectedCount > 0 || bulkSending) ? (
        <BulkActionBar
            label={plural(selectedCount, "respondent selected", "respondents selected")}
            summary={selectedTotal > 0 ? `${formatMoney(selectedTotal)} in total` : undefined}
            onClear={() => setSelectedRows({})}
            extra={
                <Button size="small" onClick={handleSelectAllPending} loading={loadingSelectAllPending}>
                    Select all pending
                </Button>
            }
            progress={bulkProgress ? {
                value: bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0,
                label: `Sending ${formatNumber(bulkProgress.done)} of ${plural(bulkProgress.total, "gift", "gifts")} — ${formatNumber(bulkProgress.success)} sent, ${formatNumber(bulkProgress.failed)} failed. Keep this page open.`,
            } : undefined}
            actions={bulkSending ? (
                <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    startIcon={<StopCircleOutlined />}
                    disabled={stopRequested}
                    onClick={handleStopBulkSend}
                >
                    {stopRequested ? 'Stopping…' : 'Stop'}
                </Button>
            ) : (
                <Button size="small" variant="contained" startIcon={<CardGiftcardIcon />} onClick={handleBulkSendClick}>
                    Send gifts
                </Button>
            )}
        />
    ) : null;

    return (
        <>
            <ProjectPageActions>
                <Button variant="outlined" color="inherit" startIcon={<FileUploadOutlined />} onClick={openImport}>
                    Import respondents
                </Button>
            </ProjectPageActions>
            <input
                type="file"
                accept=".xlsx,.xls"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleImportFile}
            />

            <ResourceTable
                columns={columns}
                data={offineProjectRespondents}
                actionStatus={{
                    type: 'import',
                    loading: loadingOfflineProjectRespondents,
                    error: errorOfflineProjectRespondents,
                    message: messageOfflineProjectRespondents
                }}
                page = {page}
                rowsPerPage = {rowsPerPage}
                total = {total}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                stickyColumns={{ first: true, last: true }}
                tabs={GIFT_TABS.map(tab => ({
                    value: tab.value,
                    label: tab.label,
                    count: tab.value === "all" ? allCount : statusCounts?.[tab.value],
                    alert: tab.value === "failed",
                }))}
                tab={statusFilter}
                onTabChange={showStatus}
                search={{
                    placeholder: "Search phone number",
                    defaultValue: searchTerm,
                    onChange: handleSearchChange,
                }}
                toolbarActions={selectedCount === 0 && !bulkSending && (
                    <Button size="small" color="inherit" onClick={handleSelectAllPending} loading={loadingSelectAllPending}>
                        Select all pending
                    </Button>
                )}
                bulkBar={bulkBar}
                banner={(bulkOutcome || failedBanner) && (
                    <Stack spacing={1}>
                        {bulkOutcome && <BulkSendResultBanner outcome={bulkOutcome} onClose={() => setBulkOutcome(null)} />}
                        {failedBanner}
                    </Stack>
                )}
                emptyState={searchTerm ? (
                    <EmptyState title="No respondents found" description={`Nothing matches “${searchTerm}”${statusFilter !== "all" ? ` in ${GIFT_STATUS_LABELS[statusFilter].toLowerCase()} gifts` : ""}.`} />
                ) : statusFilter !== "all" ? (
                    <EmptyState title={EMPTY_TAB_TITLES[statusFilter]} />
                ) : (
                    <EmptyState
                        title="No respondents yet"
                        description="Import the respondent list (InstanceID, Shell_ChainID, PhoneNumber, Channel…) to start sending gifts."
                        action={
                            <Button variant="outlined" color="inherit" startIcon={<FileUploadOutlined />} onClick={openImport}>
                                Import respondents
                            </Button>
                        }
                    />
                )}
            />

            <ConfirmDialog {...dialogProps} />
        </>
    )
}

export default Gifts;
