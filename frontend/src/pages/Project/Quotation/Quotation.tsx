import { useEffect, useState } from "react";
import axios from "axios";
import { ApiConfig } from "../../../config/ApiConfig";
import QuotationDynamicForm from "./QuotationDynamicForm";
import { useQuotation } from "../../../hook/useQuotation";
import { useParams } from "react-router-dom";
import { Alert, Box, Chip, Divider, Grid, IconButton, MenuItem, Tab, Tabs, TextField, Tooltip, Typography } from "@mui/material";
import TabPanel from "../../../components/TabPanel";
import { QuotationVersionData } from "../../../config/QuotationConfig";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import useDialog from "../../../hook/useDialog";
import AlertDialog from "../../../components/AlertDialog/AlertDialog";
import GenericDialog from "../../../components/Dialogs/GenericDialog";

const Quotation: React.FC = () => {
    const { id } = useParams<{id: string}>();
    const projectId = Number(id) || 0;

    const [ formKey, setFormKey ] = useState(0);
    const [ schema, setSchema ] = useState([]);

    const { actionState, 
            project, 
            versions, 
            selectedVersion, 
            setSelectedVersion, 
            canEdit, 
            setCanEdit, 
            getQuotationVersions, 
            addQuotation, 
            updateQuotationVersion, 
            destroyQuotationVersion,
            submitQuotationVersion,
            cloneQuotationVersion,
            approveQuotationVersion
    } = useQuotation(Number(id));
    const [ openAlert, setOpenAlert ] = useState(false);
    const [ isEditing, setIsEditing ] = useState(false);

    const { open, title, message: messageDialog, showConfirmButton, openDialog, closeDialog, confirmDialog } = useDialog();
    
    const [ openCloneNewVersion, setOpenCloneNewVersion ] = useState<boolean>(false);
    const [ selectedCloneVersion, setSelectedCloneVersion ] = useState<QuotationVersionData | null>(null);

    useEffect(() => {
        const getQuotationSchema = async () => {
            try{
                const token = localStorage.getItem('authToken');

                const url = ApiConfig.project.getQuotationSchema.replace("{projectId}", projectId.toString());

                const response = await axios.get(url, {
                    method: "GET",
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                });

                setSchema(response.data)
            } catch(error: any){
                console.error(error.response.data || error.message);
            }
        }

        getQuotationSchema();
    }, [projectId]);
    
    const handleSaveVersion = async (data:any) => {
        try
        {
            let quotation = null;

            if(isEditing){
                quotation = await updateQuotationVersion(data);
            } else {
                quotation = await addQuotation(data);
            }

            await getQuotationVersions({silent: true});

            setIsEditing(false);
            setCanEdit(true);
            setOpenAlert(true);

            setFormKey(formKey + 1);
        } catch(error: any){
            setOpenAlert(true);
        }
    };

    const handleCancel = () => {
        setSelectedVersion(selectedVersion);
        setIsEditing(false);

        setFormKey(formKey + 1);
    }

    const handleRemove = () => {
        openDialog({
            title: "Delete Version",
            message: `Are you sure that you want to remove this version "${selectedVersion?.version}"?`,
            showConfirmButton: true,
            onConfirm: async () => {
                await destroyQuotationVersion();

                setFormKey(formKey + 1);

                setIsEditing(false);
                setCanEdit(true);
                setOpenAlert(true);
            }
        });
    }

    const handleSubmit = () => {
        
        openDialog({
            title: 'Submit Version',
            message: `Are you sure that you want to submit this version?`,
            showConfirmButton: true,
            onConfirm: async () => {
                await submitQuotationVersion();
            }
        });
    };

    const handleApprove = () => {

        openDialog({
            title: 'Submit Version',
            message: `Are you sure that you want to approve this version?`,
            showConfirmButton: true,
            onConfirm: async () => {
                await approveQuotationVersion();
            }
        });
    }

    const handleOpenCloneNewVersionDialog = () => {
        setOpenCloneNewVersion(true);
    }

    const handleCloneNewVersion = async () => {
        if(!selectedCloneVersion) return;

        await cloneQuotationVersion(selectedCloneVersion);

        setFormKey(formKey + 1);

        setOpenCloneNewVersion(false);
        setSelectedCloneVersion(null);

        setIsEditing(true);
        setCanEdit(true);
        setOpenAlert(true);
    }

    const [value, setValue] = useState('one');
    
    const handleChange = (event: React.SyntheticEvent, newValue: string) => {
        setValue(newValue);
    };

    return (
        <>
            {selectedVersion && (
                <Grid item xs={12} sm={6} md={4}>
                    {openAlert && (
                        <Alert 
                            severity= {actionState.error ? "error" : "success"} 
                            sx={{ width: "100%", alignItems: "center", mb: 2 }}
                            action={
                                <IconButton
                                    aria-label="close"
                                    color="inherit"
                                    size="small"
                                    onClick={() => setOpenAlert(false)}
                                >
                                    <CloseIcon fontSize="inherit" />
                                </IconButton>
                            }
                        >
                            <span 
                                dangerouslySetInnerHTML={{ __html: actionState.message ?? "" }}
                            ></span>
                        </Alert>
                    )}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                            p: 2,
                            border: "1px solid #eee",
                            borderRadius: 2,
                            backgroundColor: "#fafafa"
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2
                            }}
                        >
                            <Typography variant="subtitle1" gutterBottom sx={{ mt: "4px"}}>
                                Version: 
                            </Typography>
                            <TextField
                                select
                                size="small"
                                variant="outlined"
                                value={selectedVersion?.id ?? ""}
                                disabled={isEditing}
                                onChange={(e) => {
                                    const version = versions?.find(v => v.id === Number(e.target.value));
                                    setSelectedVersion(version ?? null);
                                    setOpenAlert(false);
                                }}
                                sx={{width: "250px"}}
                            >
                                {versions?.map((v: QuotationVersionData) => {
                                    return (
                                        <MenuItem
                                            key={v.id} 
                                            value={v.id}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    width: "100%"
                                                }}
                                            >
                                                <span>Version {v.version}</span>
                                                
                                                <Chip
                                                    label={v.status}
                                                    size="small"
                                                    color={
                                                        v.status === "draft" ? "default" : v.status === "submitted" ? "warning" : "success"
                                                    }
                                                />
                                            </Box>
                                            
                                        </MenuItem>
                                    )
                                })}
                            </TextField>
                            
                            {canEdit && (
                                <>
                                    <Tooltip title={!isEditing ? "Edit" : "Cancel Edit"}>
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                if(isEditing){
                                                    handleCancel();
                                                } else {
                                                    setOpenAlert(false);
                                                    setIsEditing(true);
                                                }
                                            }}
                                            disabled={!(selectedVersion.status === 'draft')}
                                        >
                                            {isEditing ? <CloseIcon/> : <EditIcon/>}
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title={"Delete Draft"}>
                                        <IconButton
                                            color="error"
                                            onClick={() => handleRemove()}
                                            disabled={isEditing || (!isEditing && !(selectedVersion.status === 'draft'))}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                    
                                    <Tooltip title={selectedVersion.status === 'draft' ? "Submit Version" : "Approve Version"}>
                                        <IconButton
                                            color={selectedVersion.status === 'draft' ? "warning" : "success"}
                                            onClick={() => {
                                                if(selectedVersion.status === 'draft'){
                                                    handleSubmit();
                                                } else {
                                                    handleApprove();
                                                }
                                            }}
                                            disabled={isEditing}
                                        >
                                            {selectedVersion.status === 'draft' ? <SendIcon /> : <CheckCircleIcon />}
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Create new version">
                                        <IconButton
                                            color="success"
                                            onClick={handleOpenCloneNewVersionDialog}
                                        >
                                            <AddIcon />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}

                        </Box>
                        <Divider style={{ margin: "10px 0" }} />
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2
                            }}
                        >
                            {selectedVersion && (
                                <Typography variant="body2" color="text.secondary">
                                    {selectedVersion.status === 'draft' ? 'Created by' : 'Submitted by'}: {" "} 
                                    <strong>
                                        {selectedVersion.created_user?.name} ({selectedVersion.created_user?.email})
                                    </strong>
                                </Typography>
                            )}

                            {selectedVersion && selectedVersion.created_at && (
                                <Typography variant="body2" color="text.secondary">
                                    {selectedVersion.status === 'draft' ? 'Created at' : 'Submitted at'}: {" "}
                                    {new Date(
                                        selectedVersion.created_at
                                    ).toLocaleDateString()}
                                </Typography>
                            )}
                        </Box>
                        {selectedVersion && selectedVersion.approved_user && selectedVersion.approved_at && (
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2
                                }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    Approved by: {" "} 
                                    <strong>
                                        {selectedVersion.approved_user?.name} ({selectedVersion.approved_user?.email})
                                    </strong>
                                </Typography>

                                <Typography variant="body2" color="text.secondary">
                                    Approved at: {" "}
                                    {new Date(
                                        selectedVersion.approved_at
                                    ).toLocaleDateString()}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Grid>
            )}

            <Tabs
                value={value}
                onChange={handleChange}
                textColor="secondary"
                indicatorColor="secondary"
                aria-label="secondary tabs example"
                >
                <Tab value="one" label="GENERAL" />
                {/* <Tab value="two" label="SAMPLE" />
                <Tab value="three" label="OPERATION" /> */}
            </Tabs>

            <TabPanel value={value} index="one">
                <QuotationDynamicForm
                    key={formKey}
                    schema={schema}
                    initialQuotationData={selectedVersion?.quotation}
                    isEditting={versions?.length === 0 ? true : isEditing}
                    onSubmit={handleSaveVersion}
                />
            </TabPanel>

            <AlertDialog
                open={open}
                title={title}
                message={messageDialog}
                showConfirmButton={showConfirmButton}
                onClose={closeDialog}
                onConfirm={confirmDialog}
            />

            <GenericDialog
                open={openCloneNewVersion}
                title="Create a New Version" 
                children={
                    <TextField
                        select
                        fullWidth
                        variant="outlined"
                        value={selectedCloneVersion?.id ?? ""}
                        onChange={(e) => {
                            const version = versions?.find(v => v.id === Number(e.target.value));
                            setSelectedCloneVersion(version || null);
                        }}
                        sx={{width: "150px"}}
                    >
                        {versions?.map((v: QuotationVersionData) => {
                            return (
                                <MenuItem
                                    key={v.id} 
                                    value={v.id}
                                >
                                    Version {v.version}
                                </MenuItem>
                            )
                        })}
                    </TextField>
                } 
                onClose={() => setOpenCloneNewVersion(false)} 
                onSubmit={handleCloneNewVersion} 
                submitText = "SUBMIT"
                cancelText = "CANCEL"
            />
        </>
    )
}

export default Quotation;