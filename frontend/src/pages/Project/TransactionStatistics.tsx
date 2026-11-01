import TransactionStatisticsPanel from "../../components/TransactionStatisticsPanel";
import { useProjectContext } from "../../hook/useProjectContext";

const TransactionStatistics: React.FC = () => {
  const { projectId } = useProjectContext();

  return <TransactionStatisticsPanel projectId={projectId} />;
};

export default TransactionStatistics;
