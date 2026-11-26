import { useParams } from "react-router-dom";
import axios from "axios";
import { ProjectData } from "../../config/ProjectFieldsConfig";
import { useEffect, useState } from "react";
import { useProjects } from "../../hook/useProjects";
import { Autocomplete, Box, Checkbox, Grid, TextField, Typography, Button } from "@mui/material";
import { useMetadata } from "../../hook/useMetadata";
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import { UserData } from "../../config/AccountFieldsConfig";
import { useToast } from "../../contexts/ToastContext";
import { useTranslation } from "react-i18next";

const Assignment: React.FC = () => {
    const { id } = useParams<{id: string}>();
    const projectId = Number(id) || 0;
    const [ projectSelected, setProjectSelected ] = useState<ProjectData | null>(null);
    const [ assignedUsers, setAssignedUsers ] = useState<UserData[]>([]);

    const [ loadingAssignUsers, setLoadingAssignUsers ] = useState<boolean>(false)

    const { actionState, getProject, assignUsers } = useProjects();
    const { data, isLoading } = useMetadata();
    const { showToast } = useToast();
    const { t } = useTranslation();

    const handleAssignUsers = async () => {
        try
        {
            const user_ids = assignedUsers.map(u => u.id);

            setLoadingAssignUsers(true);

            const response = await assignUsers(projectId, user_ids);

            if (response.status_code === 400) {
                showToast(response.error || t('settings.assignment.failed'), 'error');
            } else {
                showToast(response.message || t('settings.assignment.saved'));
            }
        } catch(error){
            const message = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
            showToast(message || t('settings.assignment.failed'), 'error');
        } finally {
            setLoadingAssignUsers(false);
        }
    }

    useEffect(() => {
        async function fetchProject(){
            try{
                const p = await getProject(projectId);
                setProjectSelected(p);
                setAssignedUsers(p?.permissions || []);
            }catch(error){
                console.error(error);
            }
        }

        fetchProject();
    }, [projectId]);
    
    return (
        <Grid container spacing={2}>
            <Grid size={12}>
                <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
                    {t("settings.assignment.select")}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <Autocomplete
                            multiple
                            disableCloseOnSelect
                            options={data.users || []}
                            value={assignedUsers || []}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            onChange={(_, newValue) => setAssignedUsers(newValue)}
                            getOptionLabel={(option) => option.email}
                            renderOption={(props, option, { selected }) => (
                                <li {...props}>
                                    <Checkbox style={{ marginRight: 8 }} checked={selected} />
                                    {option.email}
                                </li>
                            )}
                            renderInput={(params) => (
                                <TextField {...params} size="small" placeholder={t("settings.assignment.placeholder")} />
                            )}
                        />
                    </Box>
                    <Button
                        variant="contained"
                        onClick={handleAssignUsers}
                        size="small"
                        startIcon={<PersonAddAltOutlinedIcon />}
                        loading={loadingAssignUsers}
                        loadingPosition="start"
                        disabled={assignedUsers.length === 0}
                    >
                        <span>{t("settings.assignment.assign")}</span>
                    </Button>
                </Box>

            </Grid>
        </Grid>
    );
}

export default Assignment;