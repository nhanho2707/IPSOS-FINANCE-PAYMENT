import axios from "axios";
import React, { useState } from "react";
import { useProjectContext } from "../../hook/useProjectContext";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import SecretTextBox from "../../components/SecretTextBox";
import FormDialog from "../../components/Dialogs/FormDialog";
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { hasRole, ROLE_ACCESS } from "../../config/RoleConfig";
import { ApiConfig } from "../../config/ApiConfig";
import ProvincePricesTable from "./ProvincePricesTable";

interface SettingsData {
    internal_code: string;
    project_name: string;
    symphony: string;
}

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <>
        <Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>{label}</Typography>
        <Typography component="dd" variant="body2" sx={{ m: 0, minWidth: 0, overflowWrap: "anywhere" }}>{children || "—"}</Typography>
    </>
);

const Settings = () => {
    const { projectId, project: selectedProject, refreshProject } = useProjectContext();
    const { showToast } = useToast();

    const { user } = useAuth();
    const canEdit = hasRole(user?.role, ROLE_ACCESS.projectEditInfo);

    const [ editOpen, setEditOpen ] = useState(false);
    const [ formData, setFormData ] = useState<SettingsData>({ internal_code: '', project_name: '', symphony: '' });
    const [ saving, setSaving ] = useState(false);
    const [ saveError, setSaveError ] = useState<string | null>(null);

    const openEdit = () => {
        setFormData({
            internal_code: selectedProject?.internal_code ?? '',
            project_name: selectedProject?.project_name ?? '',
            symphony: selectedProject?.symphony ?? '',
        });
        setSaveError(null);
        setEditOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        try {
            const token = localStorage.getItem('authToken');
            const url = ApiConfig.project.updateProjectInfo.replace('{projectId}', projectId.toString());
            await axios.put(url, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEditOpen(false);
            showToast("Project information saved.");
            await refreshProject();
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
            setSaveError(message || "The changes were not saved. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const update = (field: keyof SettingsData) => (event: React.ChangeEvent<HTMLInputElement>) =>
        setFormData(prev => ({ ...prev, [field]: event.target.value }));

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Paper
                elevation={0}
                sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "12px",
                    overflow: "hidden",
                    backgroundColor: "background.paper",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        px: 2.5,
                        py: 1.5,
                        borderBottom: 1,
                        borderColor: "divider",
                    }}
                >
                    <Typography variant="h2" component="h2">
                        Project information
                    </Typography>
                    {canEdit && (
                        <Button variant="outlined" color="inherit" size="small" startIcon={<EditOutlinedIcon />} onClick={openEdit} disabled={!selectedProject}>
                            Edit
                        </Button>
                    )}
                </Box>

                <Box sx={{ p: 2.5 }}>
                    <Box
                        component="dl"
                        sx={{ m: 0, mb: 2.5, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "160px 1fr" }, columnGap: 2, rowGap: 1.25 }}
                    >
                        <InfoRow label="Project name">{selectedProject?.project_name}</InfoRow>
                        <InfoRow label="Internal code">{selectedProject?.internal_code}</InfoRow>
                        <InfoRow label="Symphony">{selectedProject?.symphony}</InfoRow>
                    </Box>
                    <Box sx={{ maxWidth: 560 }}>
                        <SecretTextBox label="Token" value={selectedProject?.remember_token || ""} />
                    </Box>
                </Box>
            </Paper>

            <Box component="section" aria-labelledby="province-prices-title">
                <Typography id="province-prices-title" variant="h2" sx={{ mb: 0.5 }}>
                    Sample size and gift prices
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
                    Each gift is paid at the price set here for the respondent’s province and price level.
                </Typography>
                <ProvincePricesTable projectId={projectId} canEdit={canEdit} />
            </Box>

            <FormDialog
                open={editOpen}
                title="Edit project information"
                error={saveError}
                onClose={() => setEditOpen(false)}
                onSubmit={handleSave}
                submitDisabled={!formData.project_name.trim()}
                loading={saving}
            >
                <Stack spacing={2}>
                    <TextField autoFocus required size="small" label="Project name" value={formData.project_name} onChange={update("project_name")} />
                    <TextField size="small" label="Internal code" value={formData.internal_code} onChange={update("internal_code")} />
                    <TextField size="small" label="Symphony" value={formData.symphony} onChange={update("symphony")} />
                </Stack>
            </FormDialog>
        </Box>
    );
};

export default Settings;
