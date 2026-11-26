import ResourceTable from "../../components/Table/ResourceTable";
import EmptyState from "../../components/EmptyState";
import { useTransactions } from "../../hook/useTransactions";
import { useProjectContext } from "../../hook/useProjectContext";
import { transactionColumns } from "../../config/TransactionFieldsConfig";
import { useTranslation } from "react-i18next";

const Transactions: React.FC = () => {
  const { projectId } = useProjectContext();
  const { t } = useTranslation();

  const { transactions, loading: loadingTransactions, error: errorTransactions, message: messageTransactions, page, setPage, rowsPerPage, setRowsPerPage, total, searchTerm, setSearchTerm } = useTransactions(projectId);

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

  return (
    <ResourceTable
        columns={transactionColumns()}
        data={transactions}
        actionStatus={{
          type: 'fetch',
          loading: loadingTransactions,
          error: errorTransactions,
          message: messageTransactions
        }}
        page = {page}
        rowsPerPage = {rowsPerPage}
        total = {total}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        dense
        search={{
          placeholder: t("transactions.searchPlaceholder"),
          defaultValue: searchTerm,
          onChange: handleSearchChange,
        }}
        emptyState={searchTerm ? (
          <EmptyState title={t("transactions.empty.notFound")} description={t("transactions.empty.nothingMatches", { term: searchTerm })} />
        ) : (
          <EmptyState title={t("transactions.empty.noneTitle")} description={t("transactions.empty.noneDescription")} />
        )}
    />
  )
}

export default Transactions;
