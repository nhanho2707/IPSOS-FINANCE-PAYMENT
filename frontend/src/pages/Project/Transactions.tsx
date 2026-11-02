import ResourceTable from "../../components/Table/ResourceTable";
import EmptyState from "../../components/EmptyState";
import { useTransactions } from "../../hook/useTransactions";
import { useProjectContext } from "../../hook/useProjectContext";
import { TransactionCellConfig } from "../../config/TransactionFieldsConfig";

const Transactions: React.FC = () => {
  const { projectId } = useProjectContext();

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
        columns={TransactionCellConfig}
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
          placeholder: "Search phone number",
          defaultValue: searchTerm,
          onChange: handleSearchChange,
        }}
        emptyState={searchTerm ? (
          <EmptyState title="No transactions found" description={`Nothing matches “${searchTerm}”.`} />
        ) : (
          <EmptyState title="No transactions yet" description="Gifts sent from the Gifts page and the interview links appear here." />
        )}
    />
  )
}

export default Transactions;
