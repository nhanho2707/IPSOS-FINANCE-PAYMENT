import { Alert, AlertTitle, Autocomplete, Box, Button, TextField, Typography } from "@mui/material";
import { BlockOutlined, CheckCircleOutlineOutlined, DeleteOutlineOutlined, FileUploadOutlined } from "@mui/icons-material";
import { ColumnFormat } from "../../config/ColumnConfig";
import { CATIBatchData, CATIImportResult, CATIImportSkippedRow, CATIRespondentImportRow, CATIRespondentSheetRow, catiBatchColumns } from "../../config/MiniCATIFieldsConfig";
import { useTranslation } from "react-i18next";
import { CATI_BATCH_STATUS_TONE, getStatusTone } from "../../config/ThemeConfig";
import { useCATIBatch } from "../../hook/useCATIBatch";
import { useProjectContext } from "../../hook/useProjectContext";
import ResourceTable from "../../components/Table/ResourceTable";
import RowActions from "../../components/Table/RowActions";
import EmptyState from "../../components/EmptyState";
import StatusChip from "../../components/StatusChip";
import ProjectPageActions from "../../components/ProjectPageActions";
import FormDialog from "../../components/Dialogs/FormDialog";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import useDialog from "../../hook/useDialog";
import ConfirmDialog from "../../components/Dialogs/ConfirmDialog";
import { useToast } from "../../contexts/ToastContext";
import { formatNumber, formatStatus } from "../../utils/format";

const MAX_ROWS_SHOWN_PER_REASON = 30;

const REQUIRED_COLUMNS = [
    "ID", "Phone", "Name", "Link", "Filter_1", "Filter_2", "Filter_3", "Filter_4"
];

const SkippedRowsBanner: React.FC<{ result: CATIImportResult; onClose: () => void }> = ({ result, onClose }) => {
    const grouped = result.skipped.reduce((acc: Record<string, number[]>, item: CATIImportSkippedRow) => {
        acc[item.reason] = acc[item.reason] || [];
        acc[item.reason].push(item.row);
        return acc;
    }, {});
    const { t } = useTranslation();

    return (
        <Alert severity="warning" onClose={onClose}>
            <AlertTitle>
                {t("cati.skipped.title", { count: result.skipped.length, n: formatNumber(result.skipped.length) })}
            </AlertTitle>
            <Box component="ul" sx={{ m: 0, pl: 2.5, typography: "body2" }}>
                {Object.entries(grouped).map(([reason, rowNumbers]) => {
                    const shown = rowNumbers.slice(0, MAX_ROWS_SHOWN_PER_REASON).join(", ");
                    const more = rowNumbers.length > MAX_ROWS_SHOWN_PER_REASON ? `, … (+${rowNumbers.length - MAX_ROWS_SHOWN_PER_REASON})` : "";
                    return (
                        <li key={reason}>
                            {t("cati.skipped.item", { reason, total: formatNumber(rowNumbers.length), rows: `${shown}${more}` })}
                        </li>
                    );
                })}
            </Box>
        </Alert>
    );
};

const CATISettings = () => {
    const { projectId } = useProjectContext();
    const { showToast } = useToast();
    const { openDialog, dialogProps } = useDialog();
    const { t } = useTranslation();

    const { batches, actionState, page, rowsPerPage, total, setPage, setRowsPerPage, importCATIBatch, destroyBatch, updateStatus } = useCATIBatch(projectId);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [ importOpen, setImportOpen ] = useState(false);
    const [ batchName, setBatchName ] = useState<string>("");
    const [ selectedBatch, setSelectedBatch ] = useState<CATIBatchData | null>(null);
    const [ importResult, setImportResult ] = useState<CATIImportResult | null>(null);

    const confirmDelete = (batch: CATIBatchData) => openDialog({
        title: t("cati.delete.title"),
        tone: "danger",
        confirmText: t("cati.delete.confirm"),
        message: t("cati.delete.message", { name: batch.name, total: formatNumber(batch.total_records) }),
        showConfirmButton: true,
        onConfirm: () => destroyBatch(batch.id)
    });

    const confirmStatusChange = (batch: CATIBatchData) => {
        const blocking = batch.status === 'active';

        openDialog({
            title: blocking ? t("cati.block.title") : t("cati.activate.title"),
            confirmText: blocking ? t("cati.block.confirm") : t("cati.activate.confirm"),
            message: blocking
                ? t("cati.block.message", { name: batch.name })
                : t("cati.activate.message", { name: batch.name }),
            showConfirmButton: true,
            onConfirm: () => updateStatus(batch.id, blocking ? 'blocked' : 'active')
        });
    };

    const columns: ColumnFormat[] = [
        ...catiBatchColumns().map((col): ColumnFormat => col.name !== "status" ? col : {
            ...col,
            renderCell: (row: CATIBatchData) => (
                <StatusChip label={formatStatus(row.status)} tone={getStatusTone(row.status, CATI_BATCH_STATUS_TONE)} />
            )
        }),
        {
            label: "",
            name: "actions",
            type: "menu",
            align: "right",
            width: 56,
            renderAction: (row: CATIBatchData) => (
                <RowActions
                    menuLabel={t("cati.actionsFor", { name: row.name })}
                    items={[
                        {
                            label: row.status === 'active' ? t("cati.block.title") : t("cati.activate.title"),
                            icon: row.status === 'active' ? BlockOutlined : CheckCircleOutlineOutlined,
                            onClick: () => confirmStatusChange(row),
                        },
                        {
                            label: t("cati.delete.title"),
                            icon: DeleteOutlineOutlined,
                            tone: "danger",
                            onClick: () => confirmDelete(row),
                            disabled: row.to_used,
                            disabledReason: row.to_used ? t("cati.delete.used") : undefined,
                        },
                    ]}
                />
            )
        }
    ];

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

        setImportOpen(false);
        setImportResult(null);

        try
        {
            if (!batchName.trim()) {
                showToast(t("cati.toast.needName"), "warning");
                return;
            }

            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const jsonData = XLSX.utils.sheet_to_json<CATIRespondentSheetRow>(worksheet, {
                defval: ""
            });

            if (!jsonData.length) {
                showToast(t("cati.toast.noRows"), "error");
                return;
            }

            const headers = Object.keys(jsonData[0]);

            const missingColumns = REQUIRED_COLUMNS.filter(
                col => !headers.includes(col)
            );

            if(missingColumns.length > 0){
                showToast(t("cati.toast.missingColumns", { columns: missingColumns.join(", ") }), "error");
                return;
            }

            // __rowNum__ is SheetJS's 0-based sheet row, so reported row numbers match what the user sees in Excel.
            const rows: CATIRespondentImportRow[] = jsonData.map((r, index) => ({
                row: (r.__rowNum__ ?? index + 1) + 1,
                respondent_id: String(r.ID).trim(),
                phone: String(r.Phone).trim(),
                name: String(r.Name).trim(),
                link: String(r.Link).trim(),
                filter_1: String(r.Filter_1).trim(),
                filter_2: String(r.Filter_2).trim(),
                filter_3: String(r.Filter_3).trim(),
                filter_4: String(r.Filter_4).trim()
            }));

            const result = await importCATIBatch(rows, batchName.trim());

            // The summary (imported / stopped at row) is the hook's message above the table;
            // the banner lists which rows were skipped and why.
            if (result.skipped.length > 0) setImportResult(result);

            setSelectedBatch(null);
            setBatchName("");
        } catch (error) {
            console.error("Import error:", error);
        } finally {
            event.target.value = "";
        }
    };

    const importButton = (
        <Button variant="contained" startIcon={<FileUploadOutlined />} onClick={() => setImportOpen(true)}>
            {t("cati.import.button")}
        </Button>
    );

    return (
        <>
            <ProjectPageActions>{importButton}</ProjectPageActions>
            <input
                type="file"
                accept=".xlsx,.xls"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleImportFile}
            />

            <ResourceTable
                columns={columns}
                data={batches}
                actionStatus={actionState}
                page = {page}
                rowsPerPage = {rowsPerPage}
                total = {total}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                banner={importResult && <SkippedRowsBanner result={importResult} onClose={() => setImportResult(null)} />}
                emptyState={
                    <EmptyState
                        title={t("cati.empty.title")}
                        description={t("cati.empty.description")}
                        action={importButton}
                    />
                }
            />

            {/* Choosing the file is the submit step: the click on the submit button lets the browser open the file picker. */}
            <FormDialog
                open={importOpen}
                title={t("cati.import.title")}
                description={t("cati.import.description", { columns: REQUIRED_COLUMNS.join(", ") })}
                onClose={() => setImportOpen(false)}
                onSubmit={() => fileInputRef.current?.click()}
                submitText={t("cati.import.choose")}
                submitDisabled={!batchName.trim()}
            >
                <Autocomplete
                    freeSolo
                    options={batches || []}
                    value={selectedBatch}
                    inputValue={batchName}
                    getOptionLabel={(option) =>
                        typeof option === "string" ? option : option.name
                    }
                    onInputChange={(_event, value) => {
                        setBatchName(value)
                        setSelectedBatch(null);
                    }}
                    onChange={(_event, value) => {
                        if(typeof value === "string"){
                            setBatchName(value);
                            setSelectedBatch(null);
                        } else {
                            setSelectedBatch(value);
                            setBatchName(value?.name || "");
                        }
                    }}
                    renderOption={(props, option) => (
                        <li {...props} key={option.id}>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.name}</Typography>
                                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                    {t("cati.import.records", { n: formatNumber(option.total_records) })}
                                </Typography>
                            </Box>
                        </li>
                    )}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            autoFocus
                            size="small"
                            label={t("cati.import.batchName")}
                            helperText={t("cati.import.batchHelp")}
                        />
                    )}
                />
            </FormDialog>

            <ConfirmDialog {...dialogProps} />
        </>
    );
}

export default CATISettings;
