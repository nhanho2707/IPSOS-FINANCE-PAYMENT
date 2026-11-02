import { Box, MenuItem, TextField } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FormDialog from "../../Dialogs/FormDialog";
import { ProjectData } from "../../../config/ProjectFieldsConfig";
import { useProjects } from "../../../hook/useProjects";
import { useAuth } from "../../../contexts/AuthContext";
import { getProjectHomePath } from "../../../config/ProjectNavConfig";

interface ModalProps {
  openModal: boolean;
  onClose: () => void;
  metadata: {
    project_types: { id: number; name: string }[];
    departments: { id: number; name: string }[];
    teams: { id: number; name: string}[];
  }
}

const PLATFORMS = ['iField', 'Dimensions', 'Other'];

const EMPTY_PROJECT: ProjectData = {
  project_name: '',
  disabled: false,
  platform: '',
  teams: [],
  project_types: [],
  planned_field_start: '',
  planned_field_end: ''
};

const toDate = (value: string): Dayjs | null => (value ? dayjs(value) : null);
const fromDate = (value: Dayjs | null): string => (value?.isValid() ? value.format("YYYY-MM-DD") : "");

const ModalAddProject: React.FC<ModalProps> = ({ openModal, onClose, metadata }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { addProject, actionState } = useProjects();

  const [formValues, setFormValues] = useState<ProjectData>(EMPTY_PROJECT);

  const update = (patch: Partial<ProjectData>) => setFormValues((prev) => ({ ...prev, ...patch }));

  const start = toDate(formValues.planned_field_start);
  const end = toDate(formValues.planned_field_end);
  const endBeforeStart = Boolean(start && end && end.isBefore(start, "day"));
  const isSaving = actionState.type === 'add' && actionState.loading;
  const saveError = actionState.type === 'add' && actionState.error ? actionState.message : null;

  const handleSave = async () => {
    try {
      const new_project = await addProject(formValues);
      setFormValues(EMPTY_PROJECT);
      onClose();
      navigate(getProjectHomePath(new_project.id, user?.role));
    } catch {
      // useProjects already exposes the error through actionState
    }
  };

  return (
    <FormDialog
      open={openModal}
      title="New project"
      error={saveError}
      onClose={onClose}
      onSubmit={handleSave}
      submitText="Create project"
      submitDisabled={!formValues.project_name.trim() || endBeforeStart}
      loading={isSaving}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField
          autoFocus
          required
          size="small"
          label="Project name"
          value={formValues.project_name}
          onChange={(e) => update({ project_name: e.target.value })}
          sx={{ gridColumn: "1 / -1" }}
        />
        <TextField
          select
          size="small"
          label="Platform"
          value={formValues.platform}
          onChange={(e) => update({ platform: e.target.value })}
        >
          {PLATFORMS.map((platform) => (
            <MenuItem key={platform} value={platform}>{platform}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Project type"
          value={formValues.project_types[0] ?? ''}
          onChange={(e) => update({ project_types: [e.target.value] })}
        >
          {(metadata?.project_types ?? []).map((type) => (
            <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Teams"
          value={formValues.teams}
          onChange={(e) => {
            const value = e.target.value as unknown as string[] | string;
            update({ teams: typeof value === "string" ? value.split(",") : value });
          }}
          sx={{ gridColumn: "1 / -1" }}
          slotProps={{ select: { multiple: true } }}
        >
          {(metadata?.teams ?? []).map((team) => (
            <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
          ))}
        </TextField>
        <DatePicker
          label="Field start (planned)"
          value={start}
          onChange={(value) => update({ planned_field_start: fromDate(value) })}
          slotProps={{ textField: { size: "small" } }}
        />
        <DatePicker
          label="Field end (planned)"
          value={end}
          minDate={start ?? undefined}
          onChange={(value) => update({ planned_field_end: fromDate(value) })}
          slotProps={{
            textField: {
              size: "small",
              error: endBeforeStart,
              helperText: endBeforeStart ? "Ends before it starts" : undefined,
            },
          }}
        />
      </Box>
    </FormDialog>
  );
};

export default ModalAddProject;
