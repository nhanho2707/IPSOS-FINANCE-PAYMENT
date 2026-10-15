import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box } from "@mui/material";
import { ProjectData } from "../../config/ProjectFieldsConfig";
import { useProjects } from "../../hook/useProjects";
import TransactionStatisticsPanel from "../../components/TransactionStatisticsPanel";

const TransactionStatistics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id) || 0;

  const [projectSelected, setProjectSelected] = useState<ProjectData | null>(null);
  const { getProject } = useProjects();

  useEffect(() => {
    async function fetchProject() {
      try {
        const p = await getProject(projectId);
        setProjectSelected(p);
      } catch (error) {
        console.log(error);
      }
    }

    fetchProject();
  }, [projectId]);

  return (
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
      </div>

      <TransactionStatisticsPanel projectId={projectId} />
    </Box>
  );
};

export default TransactionStatistics;
