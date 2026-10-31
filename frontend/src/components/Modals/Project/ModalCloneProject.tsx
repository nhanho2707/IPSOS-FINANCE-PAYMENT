import { Alert, Box, Checkbox, FormControlLabel, FormGroup, LinearProgress, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GenericDialog from "../../Dialogs/GenericDialog";
import { CloneProjectPayload, ProjectData } from "../../../config/ProjectFieldsConfig";
import { useProjects } from "../../../hook/useProjects";

interface ModalCloneProjectProps {
  project: ProjectData;
  onClose: () => void;
}

type CloneOptionKey = 'include_prices' | 'include_quotation' | 'include_permissions';

const CLONE_OPTIONS: { key: CloneOptionKey; label: string }[] = [
  { key: 'include_prices', label: 'Giá quà & sample size theo tỉnh' },
  { key: 'include_quotation', label: 'Quotation (bản mới nhất, tạo lại thành v1 draft)' },
  { key: 'include_permissions', label: 'Danh sách user được phân quyền' },
];

const buildInitialValues = (project: ProjectData): CloneProjectPayload => ({
  project_name: `${project.project_name} (COPY)`,
  planned_field_start: project.planned_field_start ?? '',
  planned_field_end: project.planned_field_end ?? '',
  include_prices: true,
  include_quotation: true,
  include_permissions: false,
});

const ModalCloneProject: React.FC<ModalCloneProjectProps> = ({ project, onClose }) => {
  const navigate = useNavigate();
  const { cloneProject, actionState } = useProjects();

  const [formValues, setFormValues] = useState<CloneProjectPayload>(() => buildInitialValues(project));

  const isCloning = actionState.type === 'add' && actionState.loading;
  const cloneError = actionState.type === 'add' && actionState.error;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleOptionChange = (key: CloneOptionKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setFormValues((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSubmit = async () => {
    if (!project.id || isCloning) return;

    try {
      const newProject = await cloneProject(project.id, formValues);
      onClose();
      navigate(`/project-management/projects/${newProject.id}/quotation`);
    } catch {
      // actionState.error + actionState.message đã được set trong hook
    }
  };

  return (
    <GenericDialog
      open
      title={`Clone dự án ${project.internal_code ?? ''}`}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText="CLONE"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        {isCloning && <LinearProgress />}
        {cloneError && <Alert severity="error">{actionState.message}</Alert>}

        <TextField
          size="small"
          label="Project Name"
          name="project_name"
          value={formValues.project_name}
          onChange={handleInputChange}
          fullWidth
        />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            type="date"
            label="Planned Field Start"
            name="planned_field_start"
            value={formValues.planned_field_start}
            onChange={handleInputChange}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1, minWidth: 180 }}
          />
          <TextField
            size="small"
            type="date"
            label="Planned Field End"
            name="planned_field_end"
            value={formValues.planned_field_end}
            onChange={handleInputChange}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1, minWidth: 180 }}
          />
        </Box>

        <Box>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 0.5 }}>
            Sao chép thêm
          </Typography>
          <FormGroup>
            {CLONE_OPTIONS.map((option) => (
              <FormControlLabel
                key={option.key}
                control={
                  <Checkbox
                    size="small"
                    checked={formValues[option.key]}
                    onChange={handleOptionChange(option.key)}
                  />
                }
                label={option.label}
              />
            ))}
          </FormGroup>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
            Platform, loại dự án và team luôn được sao chép. Respondents, giao dịch, PVV và CATI batches không được sao chép.
          </Typography>
        </Box>
      </Box>
    </GenericDialog>
  );
};

export default ModalCloneProject;
