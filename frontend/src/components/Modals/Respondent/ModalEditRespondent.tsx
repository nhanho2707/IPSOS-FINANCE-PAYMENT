import {
  Box,
  Button,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Modal,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import "../../Modals/Modal.css";
import { useEffect, useState } from "react";

interface ModalProps {
  openModal: boolean;
  onClose: () => void;
  respondent: any;
}
const ModalEditRespondent: React.FC<ModalProps> = ({
  openModal,
  onClose,
  respondent,
}) => {
  const [formData, setFormData] = useState<any>(respondent || {});

  useEffect(() => {
    setFormData(respondent || {});
  }, [respondent]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value } = e.target as HTMLInputElement;
    setFormData((prevData: any) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const renderField = (
    columnName: string,
    type: string,
    options?: string[]
  ) => {
    options = options || [];
    if (type === "string") {
      return (
        <TextField
          className="textfield-add"
          type="text"
          name={columnName}
          placeholder={columnName}
          value={formData[columnName] || ""}
          onChange={handleChange}
        />
      );
    } else if (type === "number") {
      return (
        <TextField
          className="textfield-add"
          type="number"
          name={columnName}
          placeholder={columnName}
          value={formData[columnName] || ""}
          onChange={handleChange}
        />
      );
    } else if (type === "select" && options.length > 0) {
      return (
        <FormControl fullWidth>
          <InputLabel id={`${columnName}-label`}>{columnName}</InputLabel>
          <Select
            labelId={`${columnName}-label`}
            id={columnName}
            name={columnName}
            value={formData[columnName] || ""}
            // onChange={handleChange}
          >
            {options.map((option, index) => (
              <MenuItem key={index} value={option}>
                {option}
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
      // const response = await axios.post(
      //   ApiConfig.employee.viewEmployees,
      //   formData
      // );
    } catch (err) {
      console.log(err);
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
        >
          Edit Respondent
        </Typography>
        <Divider />

        <Grid container rowGap={3} columnSpacing={3} className="content-modal">
          {/* {TableCellParttimeEmployeesConfig.map((columns, index) => (
            <Grid key={index} item xs={12}>
              <Grid container alignItems="center">
                <Grid item xs={2}>
                  <Typography sx={{ fontWeight: "500", fontSize: "14px" }}>
                    {columns.name}:
                  </Typography>
                </Grid>
                <Grid item xs={10}>
                  {renderField(columns.name, columns.type, columns.options)}
                </Grid>
              </Grid>
            </Grid>
          ))} */}
        </Grid>
        <Box className="btn-modal-footer" textAlign="end">
          <Button color="inherit" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
          >
            Save
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ModalEditRespondent;