import { Alert, AlertTitle, Box, Button, Checkbox, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { GiftStatus, OFFLINE_RESPONDENT_IMPORT_COLUMNS, OfflineGiftBulkSendResult, OfflineImportResult, OfflineProjectRespondentData, OfflineProjectRespondentImportData, toImportRow } from "../../config/OfflineProjectRespondentFieldsConfig";
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
import { formatMoney, formatNumber, formatPhone, formatStatus } from "../../utils/format";
import { Trans, useTranslation } from "react-i18next";
import i18n from "../../i18n/i18n";

const MAX_FAILURES_SHOWN = 30;

const GIFT_STATUSES: GiftStatus[] = ["pending", "success", "failed", "refused"];

const GIFT_TAB_VALUES: (GiftStatus | "all")[] = ["all", ...GIFT_STATUSES];

const giftStatusLabel = (status: GiftStatus): string => i18n.t(`gifts.status.${status}`);

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

const BulkSendResultBanner: React.FC<{ outcome: BulkSendOutcome; onClose: () => void }> = ({ outcome, onClose }) => {
    const { t } = useTranslation();
    const { result: { results, stoppedOnFailures }, total } = outcome;
    const failures = results.filter(r => !r.success);
    const successCount = results.length - failures.length;
    const notSent = total - results.length;
    const severity = failures.length === 0 && notSent === 0 ? "success" : successCount === 0 ? "error" : "warning";

    return (
        <Alert severity={severity} onClose={onClose}>
            <AlertTitle>{t("gifts.bulkResult.title", { count: total, n: formatNumber(total), sent: formatNumber(successCount) })}</AlertTitle>
            {stoppedOnFailures && (
                <Typography variant="body2">
                    {t("gifts.bulkResult.stopped", { count: notSent, n: formatNumber(notSent), max: MAX_CONSECUTIVE_GIFT_FAILURES })}
                </Typography>
            )}
            {!stoppedOnFailures && notSent > 0 && (
                <Typography variant="body2">
                    {t("gifts.bulkResult.userStopped", { count: notSent, n: formatNumber(notSent) })}
                </Typography>
            )}
            {failures.length > 0 && (
                <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5, typography: "body2" }}>
                    {failures.slice(0, MAX_FAILURES_SHOWN).map(f => (
                        <li key={f.row.id}>{f.row.respondent_id} ({f.row.phone_number}): {f.message || t("gifts.bulkResult.failedFallback")}</li>
                    ))}
                    {failures.length > MAX_FAILURES_SHOWN && (
                        <li>{t("gifts.bulkResult.more", { count: failures.length - MAX_FAILURES_SHOWN, n: formatNumber(failures.length - MAX_FAILURES_SHOWN) })}</li>
                    )}
                </Box>
            )}
        </Alert>
    );
};

const TEST_PROJECT_STATUSES = ["in coming", "on hold"];

const ImportResultBanner: React.FC<{ result: OfflineImportResult; onClose: () => void }> = ({ result, onClose }) => {
    const { t } = useTranslation();

    return (
        <Alert severity="warning" onClose={onClose}>
            <AlertTitle>
                {t("gifts.importResult.title", { count: result.imported, n: formatNumber(result.imported), live: formatNumber(result.live), test: formatNumber(result.test) })}
            </AlertTitle>
            <Typography variant="body2">
                {t("gifts.importResult.testNote")}
                {result.projectStatus && TEST_PROJECT_STATUSES.includes(result.projectStatus) && (
                    <>
                        {" "}
                        <Trans i18nKey="gifts.importResult.projectIs" values={{ status: formatStatus(result.projectStatus) }} components={{ b: <b /> }} />
                    </>
                )}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
                {t("gifts.importResult.rule")}
            </Typography>
        </Alert>
    );
};

const Gifts: React.FC = () => {
    const { projectId } = useProjectContext();
    const { showToast } = useToast();
    const { t } = useTranslation();

    const { openDialog, closeDialog, dialogProps } = useDialog();

    const { offineProjectRespondents, removeProjectRespondent, offlineTransactionSending, bulkOfflineTransactionSending, fetchAllPendingProjectRespondents, importOfflineProjectRespondents, loading: loadingOfflineProjectRespondents, error: errorOfflineProjectRespondents, message: messageOfflineProjectRespondents, page, rowsPerPage, searchTerm, total, setSearchTerm, setPage, setRowsPerPage, statusFilter, setStatusFilter, statusCounts } = useOfflineProjectRespondents(projectId);
    const [ loadingRowId, setLoadingRowId ] = useState<string | null>(null);

    const [ selectedRows, setSelectedRows ] = useState<Record<number, OfflineProjectRespondentData>>({});
    const [ loadingSelectAllPending, setLoadingSelectAllPending ] = useState<boolean>(false);
    const [ bulkProgress, setBulkProgress ] = useState<BulkSendProgress | null>(null);
    const [ bulkOutcome, setBulkOutcome ] = useState<BulkSendOutcome | null>(null);
    const [ importOutcome, setImportOutcome ] = useState<OfflineImportResult | null>(null);
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
            title: t("gifts.remove.title"),
            tone: "danger",
            confirmText: t("gifts.remove.confirm"),
            message: t("gifts.remove.message", { id: row.respondent_id }),
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
                showToast(t("gifts.toast.noPending"), "info");
            }
        } catch(error){
            console.error('Failed to fetch pending respondents', error);
            showToast(t("gifts.toast.pendingLoadFailed"), "error");
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
            showToast(t("gifts.toast.unexpectedStop"), "error");
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
            title: t("gifts.send.title"),
            confirmText: t("gifts.send.confirm", { count: rows.length, n: formatNumber(rows.length) }),
            message: t("gifts.send.message", { count: rows.length, n: formatNumber(rows.length) }),
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
                    slotProps={{ input: { 'aria-label': t("gifts.columns.selectPage") } }}
                />
            ),
            renderCell: (row: OfflineProjectRespondentData) => (
                <Checkbox
                    size="small"
                    checked={Boolean(selectedRows[row.id])}
                    disabled={bulkSending || row.status !== 'pending'}
                    onChange={() => handleToggleRow(row)}
                    slotProps={{ input: { 'aria-label': t("gifts.columns.selectRow", { id: row.respondent_id }) } }}
                />
            )
        },
        {
            label: t("gifts.columns.respondent"),
            name: "respondent_id",
            type: "string",
            flex: 1.8,
            renderCell: (row: OfflineProjectRespondentData) => (
                <CellStack
                    primary={row.respondent_id}
                    secondary={formatPhone(row.phone_number)}
                    title={[
                        row.respondent_id,
                        t("gifts.columns.giftPhone", { phone: formatPhone(row.phone_number) }),
                        row.respondent_phone_number && t("gifts.columns.surveyPhone", { phone: formatPhone(row.respondent_phone_number) }),
                        row.email && t("gifts.columns.email", { email: row.email }),
                    ].filter(Boolean).join(" · ")}
                    numeric
                />
            )
        },
        {
            label: t("gifts.columns.interviewer"),
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
            label: t("gifts.columns.province"),
            name: "province_name",
            type: "string",
            flex: 1
        },
        {
            label: t("gifts.columns.channel"),
            name: "channel",
            type: "string",
            width: 96,
            renderCell: (row: OfflineProjectRespondentData) => <ProviderBadge provider={row.channel} />
        },
        {
            label: t("gifts.columns.amount"),
            name: "price_level",
            type: "number",
            align: "right",
            width: 112,
            renderCell: (row: OfflineProjectRespondentData) => (
                <Box component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(row.price_level)}</Box>
            )
        },
        {
            label: t("gifts.columns.status"),
            name: "status",
            type: "string",
            width: 176,
            renderCell: (row: OfflineProjectRespondentData) => (
                <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                        <StatusChip
                            label={GIFT_STATUSES.includes(row.status) ? giftStatusLabel(row.status) : row.status}
                            tone={getStatusTone(row.status, TRANSACTION_STATUS_TONE)}
                        />
                        {row.environment === "test" && (
                            <Tooltip title={t("gifts.test.hint")}>
                                <span><StatusChip label={t("gifts.test.chip")} tone="info" /></span>
                            </Tooltip>
                        )}
                    </Stack>
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
                        menuLabel={t("gifts.columns.actionsFor", { id: row.respondent_id })}
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
                                {t("gifts.send.one")}
                            </Button>
                        )}
                        items={[
                            {
                                label: t("gifts.remove.menu"),
                                icon: DeleteOutlineOutlined,
                                tone: "danger",
                                onClick: () => handleRemoveClick(row),
                                disabled: !isPending || bulkSending,
                                disabledReason: !isPending ? t("gifts.remove.onlyPending") : undefined,
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
                showToast(t("gifts.toast.missingColumns", { columns: missingColumns.join(", ") }), "error");
                return;
            }

            // Formatted-but-empty rows at the bottom of a long sheet still come back from sheet_to_json.
            const rows = sheetRows
                .map(toImportRow)
                .filter(row => OFFLINE_RESPONDENT_IMPORT_COLUMNS.some(col => row[col] !== ""));

            if (!rows.length) {
                showToast(t("gifts.toast.noRows"), "error");
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

        setImportOutcome(null);
        const result = await importOfflineProjectRespondents(payload);
        setImportOutcome(result.test > 0 ? result : null);
    };

    const openImport = () => fileInputRef.current?.click();

    const selectedTotal = Object.values(selectedRows).reduce((sum, row) => sum + (Number(row.price_level) || 0), 0);

    const showStatus = (value: string) => {
        setStatusFilter(GIFT_TAB_VALUES.find(tabValue => tabValue === value) ?? "all");
        setPage(0);
    };

    const allCount = statusCounts ? Object.values(statusCounts).reduce((sum, count) => sum + count, 0) : undefined;
    const failedCount = statusCounts?.failed ?? 0;

    // Exceptions first: failed gifts need someone to look at them, so they are announced above the list.
    const failedBanner = failedCount > 0 && statusFilter !== "failed" ? (
        <Alert
            severity="warning"
            action={<Button color="inherit" size="small" onClick={() => showStatus("failed")}>{t("gifts.banner.showFailed")}</Button>}
        >
            {t(searchTerm ? "gifts.banner.failedSearch" : "gifts.banner.failed", { count: failedCount, n: formatNumber(failedCount) })}
        </Alert>
    ) : null;

    const bulkBar = (selectedCount > 0 || bulkSending) ? (
        <BulkActionBar
            label={t("gifts.bulk.selected", { count: selectedCount, n: formatNumber(selectedCount) })}
            summary={selectedTotal > 0 ? t("gifts.bulk.total", { amount: formatMoney(selectedTotal) }) : undefined}
            onClear={() => setSelectedRows({})}
            extra={
                <Button size="small" onClick={handleSelectAllPending} loading={loadingSelectAllPending}>
                    {t("gifts.bulk.selectAllPending")}
                </Button>
            }
            progress={bulkProgress ? {
                value: bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0,
                label: t("gifts.bulk.progress", {
                    count: bulkProgress.total,
                    n: formatNumber(bulkProgress.total),
                    done: formatNumber(bulkProgress.done),
                    sent: formatNumber(bulkProgress.success),
                    failed: formatNumber(bulkProgress.failed),
                }),
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
                    {stopRequested ? t("gifts.send.stopping") : t("gifts.send.stop")}
                </Button>
            ) : (
                <Button size="small" variant="contained" startIcon={<CardGiftcardIcon />} onClick={handleBulkSendClick}>
                    {t("gifts.send.bulk")}
                </Button>
            )}
        />
    ) : null;

    return (
        <>
            <ProjectPageActions>
                <Button variant="outlined" color="inherit" startIcon={<FileUploadOutlined />} onClick={openImport}>
                    {t("gifts.import")}
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
                tabs={GIFT_TAB_VALUES.map(tabValue => ({
                    value: tabValue,
                    label: tabValue === "all" ? t("gifts.all") : giftStatusLabel(tabValue),
                    count: tabValue === "all" ? allCount : statusCounts?.[tabValue],
                    alert: tabValue === "failed",
                }))}
                tab={statusFilter}
                onTabChange={showStatus}
                search={{
                    placeholder: t("gifts.searchPlaceholder"),
                    defaultValue: searchTerm,
                    onChange: handleSearchChange,
                }}
                toolbarActions={selectedCount === 0 && !bulkSending && (
                    <Button size="small" color="inherit" onClick={handleSelectAllPending} loading={loadingSelectAllPending}>
                        {t("gifts.bulk.selectAllPending")}
                    </Button>
                )}
                bulkBar={bulkBar}
                banner={(bulkOutcome || importOutcome || failedBanner) && (
                    <Stack spacing={1}>
                        {importOutcome && <ImportResultBanner result={importOutcome} onClose={() => setImportOutcome(null)} />}
                        {bulkOutcome && <BulkSendResultBanner outcome={bulkOutcome} onClose={() => setBulkOutcome(null)} />}
                        {failedBanner}
                    </Stack>
                )}
                emptyState={searchTerm ? (
                    <EmptyState
                        title={t("gifts.empty.notFound")}
                        description={statusFilter !== "all"
                            ? t("gifts.empty.nothingMatchesIn", { term: searchTerm, status: giftStatusLabel(statusFilter).toLowerCase() })
                            : t("gifts.empty.nothingMatches", { term: searchTerm })}
                    />
                ) : statusFilter !== "all" ? (
                    <EmptyState title={t(`gifts.emptyTab.${statusFilter}`)} />
                ) : (
                    <EmptyState
                        title={t("gifts.empty.noneTitle")}
                        description={t("gifts.empty.noneDescription")}
                        action={
                            <Button variant="outlined" color="inherit" startIcon={<FileUploadOutlined />} onClick={openImport}>
                                {t("gifts.import")}
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
