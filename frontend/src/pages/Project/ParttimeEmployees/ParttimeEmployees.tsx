import { Button } from "@mui/material";
import { PersonAddAltOutlined, PersonRemoveOutlined } from "@mui/icons-material";
import { useState } from "react";
import { employeeColumns, EmployeeData } from "../../../config/EmployeeFieldsConfig";
import { useTranslation } from "react-i18next";
import useDialog from "../../../hook/useDialog";
import UniversalInputDialog from "../../../components/Dialogs/UniversalInputDialog";
import ConfirmDialog from "../../../components/Dialogs/ConfirmDialog";
import { useEmployees } from "../../../hook/useEmployees";
import { useProjectContext } from "../../../hook/useProjectContext";
import ResourceTable from "../../../components/Table/ResourceTable";
import RowActions from "../../../components/Table/RowActions";
import EmptyState from "../../../components/EmptyState";
import ProjectPageActions from "../../../components/ProjectPageActions";
import { ColumnFormat } from "../../../config/ColumnConfig";

const ParttimeEmployees = () => {
    const { projectId } = useProjectContext();
    const { t } = useTranslation();

    const { employees, total, page, setPage, rowsPerPage, setRowsPerPage, searchTerm, setSearchTerm, loading: loadingEmployees, error: errorEmployees, message: messageEmployees, addEmployees, removeEmployee } = useEmployees(projectId);

    const { openDialog, dialogProps } = useDialog();
    const [ openImportEmployeesDialog, setOpenImportEmployeesDialog ] = useState(false);

    const handleRemoveClick = (employee: EmployeeData) => {
        openDialog({
            title: t("interviewers.remove.title"),
            tone: "danger",
            confirmText: t("interviewers.remove.confirm"),
            message: t("interviewers.remove.message", { id: employee.employee_id }),
            showConfirmButton: true,
            onConfirm: async () => {
                try {
                    await removeEmployee(projectId, employee.id);
                } catch (error) {
                    console.error('Failed to remove employee', error);
                }
            }
        });
    };

    const handleImportEmployees = async (value: string) => {
        if (!projectId || !value){
            setOpenImportEmployeesDialog(false);
            return;
        }

        setPage(0);

        const employee_ids = value.split("\n").map(x => x.trim().replace(/[^a-zA-Z0-9]/g, "")).filter(Boolean);

        await addEmployees(projectId, employee_ids.join(','));

        setOpenImportEmployeesDialog(false);
    }

    const handleSearchChange = (value: string) => {
        setSearchTerm(value.toLocaleLowerCase());
        setPage(0);
    }

    const columns: ColumnFormat[] = [
        ...employeeColumns(),
        {
            label: t("interviewers.columns.transactions"),
            name: "transactions",
            type: "string",
            align: "center",
            flex: 1,
            renderHeader: () => (
                <div style={{ whiteSpace: "normal", lineHeight: 1.2, textAlign: "center" }}>
                    {t("interviewers.columns.transactions")} <br />
                    {t("interviewers.columns.breakdown")}
                </div>
            ),
            renderCell: (row: EmployeeData) => {
                return `${row.vinnet_total ?? 0} / ${row.gotit_total ?? 0} / ${row.other_total ?? 0} / ${row.transaction_total ?? 0}`;
            }
        },
        {
            label: "",
            name: "actions",
            type: "menu",
            align: "right",
            width: 56,
            renderAction: (row: EmployeeData) => {
                const hasTransactions = (row.transaction_total ?? 0) > 0;

                return (
                    <RowActions
                        menuLabel={t("interviewers.actionsFor", { id: row.employee_id })}
                        items={[
                            {
                                label: t("interviewers.remove.menu"),
                                icon: PersonRemoveOutlined,
                                tone: "danger",
                                onClick: () => handleRemoveClick(row),
                                disabled: loadingEmployees || hasTransactions,
                                disabledReason: hasTransactions ? t("interviewers.remove.hasTransactions") : undefined,
                            },
                        ]}
                    />
                )
            }
        }
    ];

    const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const addButton = (
        <Button variant="contained" startIcon={<PersonAddAltOutlined />} onClick={() => setOpenImportEmployeesDialog(true)}>
            {t("interviewers.add.title")}
        </Button>
    );

    return (
        <>
            <ProjectPageActions>{addButton}</ProjectPageActions>

            <ResourceTable
                columns={columns}
                data={employees}
                actionStatus={{
                    type: 'fetch',
                    loading: loadingEmployees,
                    error: errorEmployees,
                    message: messageEmployees
                }}
                page = {page}
                rowsPerPage = {rowsPerPage}
                total = {total}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                search={{
                    placeholder: t("interviewers.search"),
                    defaultValue: searchTerm,
                    onChange: handleSearchChange,
                }}
                emptyState={searchTerm ? (
                    <EmptyState title={t("interviewers.empty.notFound")} description={t("interviewers.empty.nothingMatches", { term: searchTerm })} />
                ) : (
                    <EmptyState
                        title={t("interviewers.empty.noneTitle")}
                        description={t("interviewers.empty.noneDescription")}
                        action={addButton}
                    />
                )}
            />

            <ConfirmDialog {...dialogProps} />

            <UniversalInputDialog
                open={openImportEmployeesDialog}
                onClose={() => setOpenImportEmployeesDialog(false)}
                onSubmit={handleImportEmployees}
                title={t("interviewers.add.title")}
                label={t("interviewers.add.label")}
                placeholder={t("interviewers.add.placeholder")}
                submitText={t("interviewers.add.submit")}
            />
        </>
    )
}

export default ParttimeEmployees;
