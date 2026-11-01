import axios from "axios";
import { useEffect, useState } from "react";
import { useProjectContext } from "../../hook/useProjectContext";
import { Box, Button, Divider, Grid, Paper, TextField, Typography } from "@mui/material";
import SecretTextBox from "../../components/SecretTextBox";
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useAuth } from "../../contexts/AuthContext";
import { hasRole, ROLE_ACCESS } from "../../config/RoleConfig";
import { ApiConfig } from "../../config/ApiConfig";
import ProvincePricesTable from "./ProvincePricesTable";

interface SettingsData {
    internal_code: string;
    project_name: string;
    symphony: string;
}

const labelSx = {
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "var(--text-color)",
    mb: 0.75,
};

const Settings = () => {
    const { projectId, project: selectedProject, refreshProject } = useProjectContext();

    const { user } = useAuth();
    const canEdit = hasRole(user?.role, ROLE_ACCESS.projectEditInfo);


    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<SettingsData>({ internal_code: '', project_name: '', symphony: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!selectedProject) return;
        setFormData({
            internal_code: selectedProject.internal_code ?? '',
            project_name: selectedProject.project_name ?? '',
            symphony: selectedProject.symphony ?? '',
        });
    }, [selectedProject]);

    const handleCancel = () => {
        setFormData({
            internal_code: selectedProject?.internal_code ?? '',
            project_name: selectedProject?.project_name ?? '',
            symphony: selectedProject?.symphony ?? '',
        });
        setIsEditing(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('authToken');
            const url = ApiConfig.project.updateProjectInfo.replace('{projectId}', projectId.toString());
            await axios.put(url, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setIsEditing(false);
            await refreshProject();
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Paper
                elevation={0}
                sx={{
                    border: "1px solid",
                    borderColor: "var(--body-color)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    backgroundColor: "var(--background-color)",
                }}
            >
                {/* Section header */}
                <Box
                    sx={{
                        px: 2,
                        py: 1.25,
                        backgroundColor: "var(--body-color)",
                        borderBottom: "2px solid",
                        borderBottomColor: "rgba(0, 157, 156, 0.2)",
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            color: "var(--text-color)",
                        }}
                    >
                        Project Information
                    </Typography>
                </Box>

                {/* Form fields */}
                <Box sx={{ p: 2.5 }}>
                    <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={6} md={4}>
                            <Typography sx={labelSx}>Internal Code</Typography>
                            <TextField
                                fullWidth
                                size="small"
                                value={formData.internal_code}
                                disabled={!isEditing}
                                onChange={(e) =>
                                    setFormData(prev => ({ ...prev, internal_code: e.target.value }))
                                }
                                sx={{
                                    "& .MuiInputBase-input.Mui-disabled": {
                                        WebkitTextFillColor: "var(--text-color)",
                                    },
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Typography sx={labelSx}>Project Name</Typography>
                            <TextField
                                fullWidth
                                size="small"
                                value={formData.project_name}
                                disabled={!isEditing}
                                onChange={(e) =>
                                    setFormData(prev => ({ ...prev, project_name: e.target.value }))
                                }
                                sx={{
                                    "& .MuiInputBase-input.Mui-disabled": {
                                        WebkitTextFillColor: "var(--text-color)",
                                    },
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Typography sx={labelSx}>Symphony</Typography>
                            <TextField
                                fullWidth
                                size="small"
                                value={formData.symphony}
                                disabled={!isEditing}
                                onChange={(e) =>
                                    setFormData(prev => ({ ...prev, symphony: e.target.value }))
                                }
                                sx={{
                                    "& .MuiInputBase-input.Mui-disabled": {
                                        WebkitTextFillColor: "var(--text-color)",
                                    },
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <SecretTextBox label="Token" value={selectedProject?.remember_token || ""} />
                        </Grid>
                    </Grid>
                </Box>

                {canEdit && (
                    <>
                        <Divider />
                        <Box sx={{ px: 2.5, py: 1.5, display: "flex", gap: 1 }}>
                            <Button
                                variant="contained"
                                startIcon={!isEditing ? <EditOutlinedIcon /> : <SaveOutlinedIcon />}
                                disabled={saving}
                                onClick={() => (!isEditing ? setIsEditing(true) : handleSave())}
                            >
                                {!isEditing ? "Edit" : saving ? "Saving..." : "Save"}
                            </Button>
                            {isEditing && (
                                <Button onClick={handleCancel} disabled={saving}>
                                    Cancel
                                </Button>
                            )}
                        </Box>
                    </>
                )}
            </Paper>

            <ProvincePricesTable projectId={projectId} canEdit={canEdit} />
        </Box>
    );
};

export default Settings;
