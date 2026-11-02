import "../../assets/css/components.css";
import React, { useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { VisibilityOff, Visibility } from "@mui/icons-material";
import LoadingButton from '@mui/lab/LoadingButton';
import SendIcon from '@mui/icons-material/Send';

import {
    Typography,
    InputLabel,
    OutlinedInput,
    IconButton,
    FormControl,
    Box
  } from "@mui/material";
import { ApiConfig } from "../../config/ApiConfig";

const useQuery = () => {
    return new URLSearchParams(useLocation().search);
};

const ConfirmPassword = () => {
    const [showPassword, setShowPassword] = useState(false);
    const handleClickShowPassword = () => setShowPassword(!showPassword);
    const [loading, setLoading] = useState(false);
    
    const query = useQuery();
    const navigate = useNavigate();
    const [email, setEmail] = useState(query.get('email') || '');
    const [token, setToken] = useState(query.get('token') || '');
    const [statusMessage, setStatusMessage] = useState('');

    const [inforResetPassword, setInforResetPassword] = useState({
        password: "",
        password_confirmation: "",
    });

    const handleChangeInput = (prev: string, value: string) => {
        setInforResetPassword({...inforResetPassword, [prev]: value});
    };
    
    const handleResetPassword = async () => {
        try{
            setLoading(true);

            const response = await axios.post(ApiConfig.account.resetPassword, {
                token: token,
                email: email,
                password: inforResetPassword.password,
                password_confirmation: inforResetPassword.password_confirmation,
            });

            navigate('/Login');
        }catch(error){
            if (axios.isAxiosError(error)) {
                setStatusMessage(error.response?.data.message);
            } else {
                console.error(error);
            }
        }finally{
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "background.default"
            }}
        >
            <Box
                component="form"
                noValidate
                onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleResetPassword(); }}
                sx={{
                    width: "100%",
                    maxWidth: 400,
                    mx: 2,
                    p: 4,
                    borderRadius: 2,
                    backgroundColor: "background.paper",
                    boxShadow: 3,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3
                }}
            >
                <Typography variant="h5" textAlign="center">
                    Confirm password
                </Typography>
                <Typography variant="body2" textAlign="center">
                    This is a secure area of the application. Please confirm your password before continuing.
                </Typography>
                {statusMessage.length !== 0 && (
                    <div className='message-invalid'>
                        <span>{statusMessage}</span>
                    </div>
                )}
                <FormControl fullWidth>
                    <InputLabel>Password</InputLabel>
                    <OutlinedInput
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        onChange={(e) => handleChangeInput("password", e.target.value)}
                        endAdornment={
                            <IconButton aria-label={showPassword ? "Hide password" : "Show password"} onClick={handleClickShowPassword}>
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        }
                        label="Password"
                    />
                </FormControl>
                <FormControl fullWidth>
                    <InputLabel>Confirm Password</InputLabel>
                    <OutlinedInput
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        onChange={(e) => handleChangeInput("password_confirmation", e.target.value)}
                        endAdornment={
                            <IconButton aria-label={showPassword ? "Hide password" : "Show password"} onClick={handleClickShowPassword}>
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        }
                        label="Confirm Password"
                    />
                </FormControl>
                <LoadingButton
                    fullWidth
                    type="submit"
                    endIcon={<SendIcon />}
                    loading={loading}
                    variant="contained"
                >
                    Reset password
                </LoadingButton>
            </Box>
        </Box>
    );
}

export default ConfirmPassword;