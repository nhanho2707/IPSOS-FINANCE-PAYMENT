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
import "../../../assets/css/modal.css";
import { useEffect, useState } from "react";
import axios from "axios";
import { ApiConfig } from "../../../config/ApiConfig";
import { SelectChangeEvent } from "@mui/material/Select";
import { useNavigate } from "react-router-dom";
import useDialog from "../../../hook/useDialog"; // Import useDialog hook
import { ColumnFormat } from "../../../config/ColumnConfig";

interface ModalProps {
  openModal: boolean;
  onClose: () => void;
}

export interface RepondentData {
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  address: string;
  province: string;
  phone_number: string,
  email: string,
}

const ModalAddRespondent: React.FC<ModalProps> = ({ openModal, onClose }) => {
  // const navigate = useNavigate();
  
  // const [statusMessage, setStatusMessage] = useState<string>("");
  // const [isError, setIsError] = useState<boolean>(false);

  // const { open, openDialog, closeDialog } = useDialog(); // Initialize useDialog
  // const [textDialog, setTextDialog] = useState({
  //   textHeader: "",
  //   textContent: "",
  // });

  // const [formFieldsConfig, setFormFieldsConfig] = useState(ModalAddProjectConfig);
  // const [formValues, setFormValues] = useState<RepondentData>({
  //   first_name: '',
  //   last_name: '',
  //   gender: '',
  //   date_of_birth: '',
  //   address: '',
  //   province: '',
  //   phone_number: '',
  //   email: '',
  // });

  // useEffect(() => {
  //   const fetchTeamOptions = async () => {
  //     try
  //     {
  //       const url = ApiConfig.project.getTeams.replace('{department_id}', '3');

  //       const responseTeam = await axios.get(url);

  //       setFormFieldsConfig(fieldsConfig => fieldsConfig.map(field => field.name == 'teams' ? {...field, options: responseTeam.data.data} : field));
  //     }
  //     catch(error)
  //     {
  //       console.log('Error fetching team options: ', error);
  //       openDialog();
  //       setTextDialog({
  //         textHeader: "Lỗi API",
  //         textContent: "Error fetching team options: " + error,
  //       });
  //     }
  //   };

  //   const fetchProjectTypeOptions = async () => {
  //     try
  //     {
  //       const responseProjectType = await axios.get(ApiConfig.project.getProjectTypes);

  //       setFormFieldsConfig(fieldsConfig => fieldsConfig.map(field => field.name == 'project_types' ? {...field, options: responseProjectType.data.data} : field));
  //     }
  //     catch(error)
  //     {
  //       console.log('Error fetching team options: ', error);
  //       openDialog();
  //       setTextDialog({
  //         textHeader: "Lỗi API",
  //         textContent: "Error fetching team options: " + error,
  //       });
  //     }
  //   };

  //   fetchTeamOptions();
  //   fetchProjectTypeOptions();
  // }, []);

  // console.log(formFieldsConfig);
  
  // const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const { name, value } = e.target;
    
  //   setFormValues({
  //     ...formValues,
  //     [name]: value
  //   });
  // };

  // const handleSelectChange = (e: SelectChangeEvent<string | string[]>) => {
  //   const { name, value } = e.target;

  //   if(name === 'platform'){
  //     setFormValues({
  //       ...formValues,
  //       platform : value as string
  //     });
  //   } else {
  //     setFormValues({
  //       ...formValues,
  //       [name]: Array.from(value)
  //     });
  //   }
  // };

  // const renderField = (
  //   column: ColumnFormat
  // ) => {
    
  //   if (column.type === "string" || column.type === "number" || column.type === "date") {
  //     return (
  //       <TextField
  //         name={column.name}
  //         className="textfield-add"
  //         type={column.type === "string" ? "text" : column.type}
  //         placeholder={column.label}
  //         value={ formValues[column.name as keyof typeof formValues] }
  //         onChange={handleInputChange}
  //       />
  //     );
  //   } else if (column.type === "select") { //&& column.options?.length > 0
  //     const isMultiSelect = column.name === 'teams' || column.name === 'project_types';
  //     const currentValue = formValues[column.name as keyof typeof formValues];

  //     return (
  //       <FormControl fullWidth>
  //         <Select
  //           name={column.name}
  //           multiple={isMultiSelect}
  //           labelId={`${column.name}-label`}
  //           id={column.name}
  //           value={isMultiSelect ? (currentValue as string[]) : (currentValue as string)}
  //           onChange={handleSelectChange}
  //         >
  //           {column.options?.map((option, index) => (
  //             <MenuItem key={index} value={option}>
  //               {option}
  //             </MenuItem>
  //           ))}
  //         </Select>
  //       </FormControl>
  //     );
  //   } else {
  //     return null;
  //   }
  // };
  
  // const handleSave = async () => {
  //   try {
  //     const token = localStorage.getItem("authToken");
  //     console.log(token);
  //     const response = await axios.post(ApiConfig.project.addProject, formValues, {
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${token}`,
  //       },
  //     });
  //     console.log("Add successful", response.data);
  //     navigate("/project-management/projects/1");
  //   } catch (error) {
  //     if (axios.isAxiosError(error)) {
  //       setStatusMessage(error.response?.data.message ?? error.message);
  //       setIsError(true);
  //     }
  //   }
  // };

  return (
    <></>
      // <Modal
      //   open={openModal}
      //   onClose={onClose}
      //   aria-labelledby="modal-modal-title"
      //   aria-describedby="modal-modal-description"
      // >
      //   <Box className="modal-box">
      //     <Typography
      //       id="modal-modal-title"
      //       variant="h6"
      //       component="h2"
      //       textAlign="center"
      //     >
      //       Add New Project
      //     </Typography>
      //     <Divider />
      //     <div className="error-control">
      //       {isError && (
      //         <Alert severity="error">{statusMessage}</Alert> 
      //       )}
      //     </div>
      //     <Grid
      //       container
      //       rowGap={3}
      //       columnSpacing={3}
      //       className="content-modal"
      //     >
      //       {formFieldsConfig.map((column, index) => (
      //         <Grid key={index} item xs={12}>
      //           <Grid container alignItems="center">
      //             <Grid item xs={2}>
      //               <Typography sx={{ fontWeight: "500", fontSize: "14px" }}>
      //                 {column.label}:
      //               </Typography>
      //             </Grid>
      //             <Grid item xs={10}>
      //               {renderField(column)}
      //             </Grid>
      //           </Grid>
      //         </Grid>
      //       ))}
      //     </Grid>
      //     <Box className="btn-modal-footer" textAlign="end">
      //       <Button className="btn-modal-cancel" onClick={onClose}>
      //         Cancel
      //       </Button>
      //       <Button
      //         className="btn-modal-submit"
      //         variant="contained"
      //         onClick={handleSave}
      //       >
      //         Save
      //       </Button>
      //     </Box>
      //     {/* show dialog khi có phản hồi từ API */}
      //     <AlertDialog
      //       openDialog={open}
      //       closeDialog={closeDialog}
      //       textHeader={textDialog.textHeader}
      //       textContent={textDialog.textContent}
      //     />
      //   </Box>
      // </Modal>
  );
};

export default ModalAddRespondent;
