import { useParams } from "react-router-dom";
import axios from "axios";
import { ProjectData } from "../../config/ProjectFieldsConfig";
import { useEffect, useState } from "react";
import { useProjects } from "../../hook/useProjects";
import { Autocomplete, Box, Checkbox, Grid, TextField, Typography } from "@mui/material";
import { useMetadata } from "../../hook/useMetadata";
import LoadingButton from "@mui/lab/LoadingButton";
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import { UserData } from "../../config/AccountFieldsConfig";
import { useToast } from "../../contexts/ToastContext";

const Assignment: React.FC = () => {
    const { id } = useParams<{id: string}>();
    const projectId = Number(id) || 0;
    const [ projectSelected, setProjectSelected ] = useState<ProjectData | null>(null);
    const [ assignedUsers, setAssignedUsers ] = useState<UserData[]>([]);

    const [ loadingAssignUsers, setLoadingAssignUsers ] = useState<boolean>(false)

    const { actionState, getProject, assignUsers } = useProjects();
    const { data, isLoading } = useMetadata();
    const { showToast } = useToast();

    const handleAssignUsers = async () => {
        try
        {
            const user_ids = assignedUsers.map(u => u.id);

            setLoadingAssignUsers(true);

            const response = await assignUsers(projectId, user_ids);

            if (response.status_code === 400) {
                showToast(response.error || 'Assignment failed.', 'error');
            } else {
                showToast(response.message || 'Assignment saved.');
            }
        } catch(error){
            const message = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
            showToast(message || 'Assignment failed.', 'error');
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
            <Grid item xs={12}>
                <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
                    Select users to assign to this project:
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
                                <TextField {...params} size="small" placeholder="Select..." />
                            )}
                        />
                    </Box>
                    <LoadingButton
                        variant="contained"
                        onClick={handleAssignUsers}
                        size="small"
                        startIcon={<PersonAddAltOutlinedIcon />}
                        loading={loadingAssignUsers}
                        loadingPosition="start"
                        disabled={assignedUsers.length === 0}
                    >
                        <span>Assign</span>
                    </LoadingButton>
                </Box>

            </Grid>
        </Grid>
    )
}

export default Assignment;