import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  Grid,
  MenuItem,
  Modal,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import "../../../assets/css/modal.css";
import { useEffect, useState } from "react";
import { SelectChangeEvent } from "@mui/material/Select";
import { useNavigate } from "react-router-dom";
import { ColumnFormat } from "../../../config/ColumnConfig";
import { ProjectData } from "../../../config/ProjectFieldsConfig";
import { ProjectGeneralFieldsConfig } from "../../../config/ProjectFieldsConfig";
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

const ModalAddProject: React.FC<ModalProps> = ({ openModal, onClose, metadata }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { addProject, actionState } = useProjects();

  const [formFieldsConfig, setFormFieldsConfig] = useState(ProjectGeneralFieldsConfig);
  const [formValues, setFormValues] = useState<ProjectData>({
    project_name: '',
    disabled: false,
    platform: '',
    teams: [],
    project_types: [],
    planned_field_start: '',
    planned_field_end: ''
  });
  
  useEffect(() => {
    if(metadata){
      setFormFieldsConfig((fieldsConfig) => 
        fieldsConfig.map((field) => {
          if(field.name === "project_types"){
            return {
              ...field,
              options: metadata.project_types.map((pt) => ({
                value: pt.id,
                label: pt.name
              })),
            };
          } else if(field.name === "departments"){
            return {
              ...field,
              options: metadata.departments.map((d) => ({
                value: d.id,
                label: d.name
              }))
            }
          } else if(field.name === "teams"){
            return{
              ...field,
              options: metadata.teams.map((team) => ({
                value: team.id,
                label: team.name
              }))
            }
          }
          return field;
        })
      )
    }
  }, [metadata]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormValues({
      ...formValues,
      [name]: value
    });
  };

  const handleSelectChange = (e: SelectChangeEvent<string | string[]>) => {
    const { name, value } = e.target;

    if (name === 'platform') {
      setFormValues({ ...formValues, platform: value as string });
    } else if (name === 'project_types') {
      setFormValues({ ...formValues, project_types: [value as string] });
    } else {
      setFormValues({ ...formValues, [name]: value as string[] });
    }
  };

  const renderField = (
    column: ColumnFormat
  ) => {
    
    if (column.type === "string" || column.type === "number" || column.type === "date") {
      return (
        <TextField
          size="small"
          name={column.name}
          className="textfield-add"
          type={column.type === "string" ? "text" : column.type}
          placeholder={column.label}
          value={ formValues[column.name as keyof typeof formValues] }
          onChange={handleInputChange}
        />
      );
    } else if (column.type === "select") { //&& column.options?.length > 0
      const isMultiSelect = column.name === 'teams';
      const currentValue = formValues[column.name as keyof typeof formValues];
      const selectValue = isMultiSelect
        ? (currentValue as string[])
        : Array.isArray(currentValue)
          ? (currentValue as string[])[0] ?? ''
          : (currentValue as string);

      return (
        <FormControl fullWidth>
          <Select
            size="small"
            name={column.name}
            multiple={isMultiSelect}
            labelId={`${column.name}-label`}
            id={column.name}
            value={selectValue}
            onChange={handleSelectChange}
          >
            {column.options?.map((option, index) => (
              <MenuItem key={index} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    } else {
      return null;
    }
  };
  
  const handleSave = async () => {
    try {
      const new_project = await addProject(formValues);
      onClose();
      navigate(getProjectHomePath(new_project.id, user?.role));
    } catch {
      // useProjects already exposes the error through actionState
    }
  };

  return (
      <Modal
        open={openModal}
        onClose={onClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box className="modal-box">
          <Typography
            id="modal-modal-title"
            variant="h6"
            component="h2"
            textAlign="center"
            noWrap
          >
            Add New Project
          </Typography>
          <Divider />
          <div className="error-control">
            {actionState.error && (
              <Alert severity="error">{actionState.message}</Alert>
            )}
          </div>
          <Grid
            container
            rowGap={3}
            columnSpacing={3}
            className="content-modal"
          >
            {formFieldsConfig.map((column, index) => (
              <Grid key={index} item xs={12}>
                <Grid container alignItems="center">
                  <Grid item xs={4}>
                    <Typography 
                      noWrap
                    >
                      {column.label}:
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    {renderField(column)}
                  </Grid>
                </Grid>
              </Grid>
            ))}
          </Grid>
          <Box className="btn-modal-footer" textAlign="end">
            <Button color="inherit" onClick={onClose}>
              Cancel
            </Button>
            <LoadingButton
              variant="contained"
              loading={actionState.loading}
              onClick={handleSave}
            >
              Save
            </LoadingButton>
          </Box>
        </Box>
      </Modal>
  );
};

export default ModalAddProject;
