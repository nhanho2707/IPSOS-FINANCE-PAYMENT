import { Box, FormControl, InputLabel, MenuItem, TextField, Typography } from "@mui/material";
import LoadingButton from '@mui/lab/LoadingButton';
import { useEffect, useState } from "react";
import axios from "axios";
import { ApiConfig } from "../../config/ApiConfig";
import { useNavigate } from "react-router-dom";

interface CATIProjectData {
    id: number,
    internal_code: string,
    project_name: string
}

export default function MiniCATILogin(){

    const navigate = useNavigate();

    const [ projectId, setProjectId ] = useState<number>(0);
    const [ employeeId, setEmployeeId ] = useState<string>("");
    const [ error, setError ] = useState<string>("");
    const [ loading, setLoading ] = useState<boolean>(false);

    const [ catiProjects, setCATIProjects ] = useState<CATIProjectData[]>([]);

    const getCATIProjects = async () => {
        try
        {
            const response = await axios.get(ApiConfig.minicati.showCATIProjects);

            setCATIProjects(response.data.data);
        } catch(error: any){
            setError(error.response.data);
        }
    }

    const handleLogin = async () => {
        try
        {
            setLoading(true);
            setError("");

            const response = await axios.post(ApiConfig.minicati.validateEmployee, {
                project_id: projectId,
                employee_id: employeeId
            });

            const token = response.data.token;

            localStorage.setItem('cati_token', token);

            if(localStorage.getItem('cati_token')){
                navigate(`/mini-cati?project_id=${projectId}`);
            }
        } catch(error: any){
            setError(error.response.data.message || error.response.error);
        } finally {
            setLoading(false);
            setProjectId(0);
            setEmployeeId("");
        }
    }

    useEffect(() => {
        getCATIProjects();
    }, []);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#f5f5f5"
            }}
        >
            <Box 
                sx={{ 
                    width: 500,
                    p: 4,
                    borderRadius: 2,
                    backgroundColor: "#fff",
                    boxShadow: 3,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3
                }}
            >
                <Typography variant="h6" textAlign="center">
                    <span>MINI-CATI Login</span>
                </Typography>
                {error.length != 0 && (
                    <div className='message-invalid'>
                        <span>{error}</span>
                    </div>
                )}
                <FormControl 
                    fullWidth
                    variant="outlined"
                >
                    <Typography>
                        Select Project
                    </Typography>
                    <TextField
                        select
                        value={projectId}
                        onChange={(e) => setProjectId(Number(e.target.value))}
                        fullWidth
                        margin="normal" 
                    >
                        {catiProjects.map((p, index) => (
                            <MenuItem key={index} value={p.id}>
                                {p.internal_code} - {p.project_name}
                            </MenuItem>
                        ))}
                    </TextField>
                </FormControl>
                <FormControl 
                    fullWidth
                    variant="outlined"
                >
                    <Typography>
                        Interviewer ID:
                    </Typography>
                    <TextField 
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                </FormControl>

                <LoadingButton
                    fullWidth
                    onClick={handleLogin}
                    loading={loading}
                    disabled={!projectId || !employeeId}
                    variant="contained"
                >
                    LOGIN
                </LoadingButton>
            </Box>
        </Box>
    )
} 