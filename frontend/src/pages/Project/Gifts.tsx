import { Box, Button, Checkbox, IconButton, LinearProgress, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ProjectData } from "../../config/ProjectFieldsConfig";
import { useProjects } from "../../hook/useProjects";
import { OfflineGiftSendResult, OfflineProjectRespondentCellConfig, OfflineProjectRespondentData, OfflineProjectRespondentImportData } from "../../config/OfflineProjectRespondentFieldsConfig";
import { ColumnFormat } from "../../config/ColumnConfig";
import SearchTextBox from "../../components/SearchTextBox";
import ReusableTable from "../../components/Table/ReusableTable";
import * as XLSX from "xlsx";
import AlertDialog from "../../components/AlertDialog/AlertDialog";
import useDialog from "../../hook/useDialog";
import { useOfflineProjectRespondents } from "../../hook/useOfflineProjectRespondents";
import DeleteIcon from "@mui/icons-material/Delete";
import LoadingButton from '@mui/lab/LoadingButton';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import StopIcon from '@mui/icons-material/Stop';

const MAX_FAILURES_SHOWN = 30;

interface BulkSendProgress {
    done: number,
    total: number,
    success: number,
    failed: number
};

const Gifts: React.FC = () => {
    const { id } = useParams<{id: string}>();
    const projectId = Number(id) || 0;
    const [ projectSelected, setProjectSelected] = useState<ProjectData | null>(null);

    const { open, title, message, showConfirmButton, openDialog, closeDialog, confirmDialog } = useDialog();
    
    const { getProject } = useProjects();
    const [ offlineProjectRespondentCellConfig, setOfflineProjectRespondentCellConfig ] = useState(OfflineProjectRespondentCellConfig);

    const { offineProjectRespondents, removeProjectRespondent, offlineTransactionSending, bulkOfflineTransactionSending, fetchAllPendingProjectRespondents, importOfflineProjectRespondents, loading: loadingOfflineProjectRespondents, error: errorOfflineProjectRespondents, message: messageOfflineProjectRespondents, page, rowsPerPage, searchTerm, total, setSearchTerm, setPage, setRowsPerPage } = useOfflineProjectRespondents(projectId);
    const [ loadingRowId, setLoadingRowId ] = useState<string | null>(null);

    const [ selectedRows, setSelectedRows ] = useState<Record<number, OfflineProjectRespondentData>>({});
    const [ loadingSelectAllPending, setLoadingSelectAllPending ] = useState<boolean>(false);
    const [ bulkProgress, setBulkProgress ] = useState<BulkSendProgress | null>(null);
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

    const handleRemoveCancelDialog = () => {
        closeDialog();
    }

    const handleRemoveConfirmDialog = async (row: OfflineProjectRespondentData) => {
        try{
            await removeProjectRespondent(projectId, row);
        } catch(error){
            console.error('Failed to remove employee', error);
        }finally{
            closeDialog();
        }
    }

    const handleRemoveClick = (row: OfflineProjectRespondentData) => {
        openDialog({
            title: "Remove Respondents",
            message: "Are you sure that you want to remove " + row.respondent_id + " from this project?",
            showConfirmButton: true,
            onClose: handleRemoveCancelDialog,
            onConfirm: () => handleRemoveConfirmDialog(row)
        });
    }

    const handleSendGiftClick = async (row: OfflineProjectRespondentData) => {
        try
        {
            setLoadingRowId(row.respondent_id);
            await offlineTransactionSending(projectId, row);
        }catch(error){
            console.error('Failed to send SMS', error);
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
                openDialog({
                    title: "Tặng quà hàng loạt",
                    message: "Không có đáp viên nào đang ở trạng thái pending.",
                    showConfirmButton: false
                });
            }
        } catch(error){
            console.error('Failed to fetch pending respondents', error);

            openDialog({
                title: "Tặng quà hàng loạt",
                message: "Không tải được danh sách đáp viên pending. Vui lòng thử lại.",
                showConfirmButton: false
            });
        } finally {
            setLoadingSelectAllPending(false);
        }
    }

    const showBulkSendSummary = (results: OfflineGiftSendResult[], total: number) => {
        const failures = results.filter(r => !r.success);
        const successCount = results.length - failures.length;

        const lines = [
            `Thành công: ${successCount}/${total}`,
            `Thất bại: ${failures.length}`,
            ...(results.length < total ? [`Đã dừng: ${total - results.length} đáp viên chưa được gửi.`] : []),
            ...(failures.length > 0 ? ["", "Danh sách lỗi:"] : []),
            ...failures.slice(0, MAX_FAILURES_SHOWN).map(f => `❌ ${f.row.respondent_id} (${f.row.phone_number}): ${f.message}`),
            ...(failures.length > MAX_FAILURES_SHOWN ? [`... và ${failures.length - MAX_FAILURES_SHOWN} lỗi khác`] : [])
        ];

        openDialog({
            title: "Kết quả tặng quà hàng loạt",
            message: lines.join("\n"),
            showConfirmButton: false
        });
    }

    const handleBulkSendConfirm = async (rows: OfflineProjectRespondentData[]) => {
        stopBulkRef.current = false;
        setStopRequested(false);
        setBulkProgress({ done: 0, total: rows.length, success: 0, failed: 0 });

        try
        {
            const results = await bulkOfflineTransactionSending(
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
            showBulkSendSummary(results, rows.length);
        } catch(error){
            console.error('Failed to send gifts', error);
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
            title: "Tặng quà hàng loạt",
            message: `Bạn có chắc chắn muốn tặng quà cho ${rows.length} đáp viên đã chọn?`,
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
            width: 56,
            renderHeader: () => (
                <Checkbox
                    size="small"
                    checked={pendingRowsOnPage.length > 0 && selectedOnPageCount === pendingRowsOnPage.length}
                    indeterminate={selectedOnPageCount > 0 && selectedOnPageCount < pendingRowsOnPage.length}
                    disabled={bulkSending || pendingRowsOnPage.length === 0}
                    onChange={handleTogglePage}
                />
            ),
            renderCell: (row: OfflineProjectRespondentData) => (
                <Checkbox
                    size="small"
                    checked={Boolean(selectedRows[row.id])}
                    disabled={bulkSending || row.status !== 'pending'}
                    onChange={() => handleToggleRow(row)}
                />
            )
        },
        ...offlineProjectRespondentCellConfig,
        {
            label: "Status",
            name: "status",
            type: "string",
            align: "center",
            flex: 1,
            renderHeader: () => {
                return (
                    <div style={{ whiteSpace: "normal", lineHeight: 1.2, textAlign: "center" }}>
                        Status 
                    </div>
                );
            },
            renderCell: (row: any) => {
                return (
                    <div>
                        <span className={"box-status-button " + row.status.toLocaleLowerCase().replace(" ", "-")}>{row.status}</span>
                    </div>
                );
            }
        },
        {
            label: "Actions",
            name: "actions",
            type: "menu",
            align: "center",
            flex: 1,
            renderHeader: () => {
                return (
                    <div style={{ whiteSpace: "normal", lineHeight: 1.2, textAlign: "center" }}>
                        Actions 
                    </div>
                );
            },
            renderAction: (row: any) => {
                const disabled = (row.status != 'pending');

                return (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <IconButton
                            color="error"
                            size="small"
                            disabled={disabled}
                            onClick={() => handleRemoveClick(row)}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </div>
                )
            }
        },
        {
            label: "",
            name: "functions",
            type: "menu",
            align: "center",
            flex: 1,
            renderAction: (row: OfflineProjectRespondentData) => {
                const disabled = (row.status != 'pending');
                const view_disabled = row.status == 'success';

                return (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <LoadingButton
                            onClick={() => handleSendGiftClick(row)}
                            size="small"
                            startIcon={<CardGiftcardIcon />}
                            loading={(loadingRowId === row.respondent_id)}
                            loadingPosition="start"
                            variant="contained"
                            disabled={disabled || bulkSending}
                            sx={{
                                backgroundColor: 'var(--vinnet-color-primary)',
                                color: '#fff',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                textTransform: 'none',
                                letterSpacing: '0.02em',
                                borderRadius: '0.625rem',
                                px: 2,
                                py: 0.625,
                                boxShadow: 'none',
                                transition: 'var(--transition-02)',
                                '&:hover': {
                                    backgroundColor: 'var(--vinnet-color-primary)',
                                    filter: 'brightness(1.1)',
                                    boxShadow: '0 0.25rem 0.75rem rgba(0, 122, 255, 0.35)',
                                },
                                '&.Mui-disabled': {
                                    backgroundColor: 'rgba(0, 122, 255, 0.3)',
                                    color: '#fff',
                                },
                            }}
                            >
                                Tặng quà
                        </LoadingButton>
                    </div>
                    
                )
            }
        }
    ];

    const handleSearchChange = (value: string) => {
        setSearchTerm(value.toLocaleLowerCase());
    }

    const handleChangePage = (event: any, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: any) => {
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

            const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {
                defval: ""
            });

            if (!jsonData.length) {
                openDialog({
                    title: "Import Respondents Failed",
                    message: 'File không có dữ liệu!',
                    showConfirmButton: false
                });
                return;
            }

            const REQUIRED_COLUMNS = [
                "InstanceID",	"Shell_ChainID", "SamplePoint",	"Province",	"InterviewerID", "RespondentPhoneNumber", "PhoneNumber", "Email", "PriceLevel", "Channel"
            ]

            const hearders = Object.keys(jsonData[0]);

            const missingColumns = REQUIRED_COLUMNS.filter(
                col => !hearders.includes(col)
            );

            if(missingColumns.length > 0){
                openDialog({
                    title: "Import Respondents Failed",
                    message: `File thiếu cột bắt buộc: ${missingColumns.join(", ")} `,
                    showConfirmButton: false
                });
                return;
            }
            
            await importRespondents(jsonData);
        } catch (error) {
            console.error("Import error:", error);
        } finally {
            event.target.value = "";
        }

    };

    const importRespondents = async (rows:  OfflineProjectRespondentImportData[]) => {
        const payload = rows.map(r => ({
            instance_id: r.InstanceID.toString(),
            shell_chainid: r.Shell_ChainID.toString(),
            location_id: r.SamplePoint.toString(),
            province_name: r.Province.toString(),
            employee_id: r.InterviewerID.toString(),
            respondent_phone_number: r.RespondentPhoneNumber.toString() ?? null,
            phone_number: r.PhoneNumber.toString() ?? null,
            email: r.Email.toString() ?? null,
            price_level: r.PriceLevel.toString() ?? null,
            channel: r.Channel.toString() ?? null
        }));

        await importOfflineProjectRespondents(payload);
    };
    
    useEffect(() => {
        async function fetchProject(){
            try{
                const p = await getProject(projectId);
                setProjectSelected(p);
            }catch(error){
                console.log(error);
            }
        }

        fetchProject();
    }, [projectId]);

    return (
        <>
            <Box className="box-table">
            <div className="filter">
                <div className="filter-left">
                    <div className="project-info">
                    <div>
                        <strong>Project Name:</strong> {projectSelected?.project_name}
                    </div>
                    <div>
                        <strong>Symphony:</strong> {projectSelected?.symphony}
                    </div>
                    </div>
                </div>
                <div className="filter-right">
                    <Button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                        Import Respondents
                    </Button>
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleImportFile}
                    />
                </div>
            </div>
            <div className="filter">
                {/* LEFT: Bulk gift sending */}
                <div className="filter-left">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <LoadingButton
                            onClick={handleBulkSendClick}
                            size="small"
                            startIcon={<CardGiftcardIcon />}
                            loading={bulkSending}
                            loadingPosition="start"
                            variant="contained"
                            disabled={selectedCount === 0 || bulkSending}
                            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '0.625rem', boxShadow: 'none' }}
                        >
                            Tặng quà hàng loạt ({selectedCount})
                        </LoadingButton>
                        <LoadingButton
                            onClick={handleSelectAllPending}
                            size="small"
                            loading={loadingSelectAllPending}
                            variant="outlined"
                            disabled={bulkSending}
                            sx={{ textTransform: 'none', borderRadius: '0.625rem' }}
                        >
                            Chọn tất cả pending
                        </LoadingButton>
                        {selectedCount > 0 && !bulkSending && (
                            <Button
                                size="small"
                                onClick={() => setSelectedRows({})}
                                sx={{ textTransform: 'none' }}
                            >
                                Bỏ chọn
                            </Button>
                        )}
                        {bulkSending && (
                            <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                startIcon={<StopIcon />}
                                disabled={stopRequested}
                                onClick={handleStopBulkSend}
                                sx={{ textTransform: 'none', borderRadius: '0.625rem' }}
                            >
                                {stopRequested ? 'Đang dừng...' : 'Dừng'}
                            </Button>
                        )}
                    </Box>
                </div>
    
                {/* RIGHT: Search + Date filter */}
                <div className="filter-right">
                    <SearchTextBox placeholder="Search phone number..." onSearchChange={handleSearchChange} />
                </div>
            </div>
            
            {bulkProgress && (
                <Box sx={{ px: 2, mb: 1.5 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                        Đang tặng quà {bulkProgress.done}/{bulkProgress.total} — thành công {bulkProgress.success}, lỗi {bulkProgress.failed}. Vui lòng không đóng trang.
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0}
                    />
                </Box>
            )}

            <ReusableTable
                title="Employees"
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
            ></ReusableTable>
    
            <AlertDialog
                open={open}
                onClose={closeDialog}
                onConfirm={confirmDialog}
                showConfirmButton={showConfirmButton}
                title={title}
                message={message}
            />
            </Box>
        </>
    )
}

export default Gifts;