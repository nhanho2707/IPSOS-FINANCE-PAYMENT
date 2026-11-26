import { Box, Checkbox, FormControlLabel, FormGroup, TextField, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FormDialog from "../../Dialogs/FormDialog";
import { CloneProjectPayload, ProjectData } from "../../../config/ProjectFieldsConfig";
import { getProjectHomePath } from "../../../config/ProjectNavConfig";
import { useAuth } from "../../../contexts/AuthContext";
import { useProjects } from "../../../hook/useProjects";
import { useTranslation } from "react-i18next";
import { tKey, TranslationKey } from "../../../i18n/i18n";

interface ModalCloneProjectProps {
  project: ProjectData;
  onClose: () => void;
}

type CloneOptionKey = 'include_prices' | 'include_quotation' | 'include_permissions';

const CLONE_OPTIONS: { key: CloneOptionKey; label: TranslationKey }[] = [
  { key: 'include_prices', label: 'projects.form.copyPrices' },
  { key: 'include_quotation', label: 'projects.form.copyQuotation' },
  { key: 'include_permissions', label: 'projects.form.copyPermissions' },
];

const buildInitialValues = (project: ProjectData): CloneProjectPayload => ({
  project_name: `${project.project_name} (COPY)`,
  planned_field_start: project.planned_field_start ?? '',
  planned_field_end: project.planned_field_end ?? '',
  include_prices: true,
  include_quotation: true,
  include_permissions: false,
});

const toDate = (value: string): Dayjs | null => (value ? dayjs(value) : null);
const fromDate = (value: Dayjs | null): string => (value?.isValid() ? value.format("YYYY-MM-DD") : "");

const ModalCloneProject: React.FC<ModalCloneProjectProps> = ({ project, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cloneProject, actionState } = useProjects();
  const { t } = useTranslation();

  const [formValues, setFormValues] = useState<CloneProjectPayload>(() => buildInitialValues(project));

  const isCloning = actionState.type === 'add' && actionState.loading;
  const cloneError = actionState.type === 'add' && actionState.error ? actionState.message : null;

  const start = toDate(formValues.planned_field_start);
  const end = toDate(formValues.planned_field_end);
  const endBeforeStart = Boolean(start && end && end.isBefore(start, "day"));

  const handleOptionChange = (key: CloneOptionKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setFormValues((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSubmit = async () => {
    if (!project.id || isCloning) return;

    try {
      const newProject = await cloneProject(project.id, formValues);
      onClose();
      navigate(getProjectHomePath(newProject.id ?? 0, user?.role));
    } catch {
      // useProjects already exposes the error through actionState
    }
  };

  return (
    <FormDialog
      open
      title={t("projects.form.cloneTitle", { code: project.internal_code ?? "" }).trim()}
      error={cloneError}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={t("projects.form.clone")}
      submitDisabled={!formValues.project_name.trim() || endBeforeStart}
      loading={isCloning}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          autoFocus
          required
          size="small"
          label={t("projects.form.name")}
          value={formValues.project_name}
          onChange={(e) => setFormValues((prev) => ({ ...prev, project_name: e.target.value }))}
          fullWidth
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <DatePicker
            label={t("projects.form.start")}
            value={start}
            onChange={(value) => setFormValues((prev) => ({ ...prev, planned_field_start: fromDate(value) }))}
            slotProps={{ textField: { size: "small" } }}
          />
          <DatePicker
            label={t("projects.form.end")}
            value={end}
            minDate={start ?? undefined}
            onChange={(value) => setFormValues((prev) => ({ ...prev, planned_field_end: fromDate(value) }))}
            slotProps={{
              textField: {
                size: "small",
                error: endBeforeStart,
                helperText: endBeforeStart ? t("projects.form.endBeforeStart") : undefined,
              },
            }}
          />
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {t("projects.form.alsoCopy")}
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
                label={tKey(option.label)}
                slotProps={{ typography: { variant: "body2" } }}
              />
            ))}
          </FormGroup>
          <Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: 0.5 }}>
            {t("projects.form.copyNote")}
          </Typography>
        </Box>
      </Box>
    </FormDialog>
  );
};

export default ModalCloneProject;
