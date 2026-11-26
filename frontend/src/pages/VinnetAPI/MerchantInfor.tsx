import { useEffect, useState } from 'react';
import axios from 'axios';

import {    
    Grid,
    Stack,
    FormControl,
    InputLabel,
    OutlinedInput,
    IconButton,
    Card,
    CardHeader,
    CardContent,
    CardActions,
    Divider,
    Button,
} from '@mui/material';

import { VisibilityOff, Visibility } from "@mui/icons-material";
import SendIcon from '@mui/icons-material/Send';
import { ApiConfig } from '../../config/ApiConfig';
import { useInputContext } from '../../contexts/InputContext';

const MerchantInfor = () => {
    const token = localStorage.getItem("authToken");

    const [loading, setLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    
    const [showPassword, setShowPassword] = useState(false);
    const handleClickShowPassword = () => setShowPassword(!showPassword);

    const { inputs, setInputValue } = useInputContext();
 
    useEffect(() => {
        setLoading(true);

        const fetchMerchantInfor = async () => {
            try {
                const response = await axios.get(ApiConfig.vinnet.viewMerchantInfo, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    }
                });
                
                
                setInputValue("merchantCode", response.data.data.VINNET_MERCHANT_CODE || '');
                setInputValue("merchantKey", response.data.data.VINNET_MERCHANT_KEY || '');
            } catch (error) {
                setIsError(true);

                if (axios.isAxiosError(error)) {
                    const errorMessage = error.response?.data.message ?? error.message;
                    setStatusMessage(errorMessage);
                    console.error('Error:', errorMessage);
                } else {
                    const errorMessage = (error as Error).message;
                    setStatusMessage(errorMessage);
                    console.error('Error:', errorMessage);
                }
            } finally {
                setLoading(false);
            }
        };
        
        fetchMerchantInfor();
    }, [token]);

    const handleChangeKey = async () => {
        try {
            setStatusMessage('');
            setIsError(false);

            const response = await axios.post(ApiConfig.vinnet.changeMerchantKey, {}, {
                headers : {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
            });

            setInputValue("merchantKey", response.data.data);
            
        } catch (error: any) {
            setIsError(true);

            if (axios.isAxiosError(error)) {
                const errorMessage = error.response?.data.message ?? error.message;
                setStatusMessage(errorMessage);
                console.error('Error:', errorMessage);
            } else {
                const errorMessage = (error as Error).message;
                setStatusMessage(errorMessage);
                console.error('Error:', errorMessage);
            }
        }finally{
            setLoading(false);
        }
    }

    return (
        <>
            <Card sx={{
                borderRadius: "10px"
            }}>
                <CardHeader title="Merchant Information" 
                    subheader={isError && (
                        <div className='message-invalid'>
                            <span>{statusMessage}</span>
                        </div>
                    )} 
                />
                <Divider />
                <CardContent>
                    <Grid container spacing={2} columns={16}>
                        <Grid size={8}>
                            <Stack spacing={1}>
                                <InputLabel htmlFor="merchantcode">Merchant Code</InputLabel>
                                <FormControl fullWidth variant="outlined">
                                    <OutlinedInput 
                                        id="merchantcode"
                                        name="merchantcode" 
                                        type= { showPassword ? "text" : "password"}  
                                        readOnly
                                        value={inputs['merchantCode']}
                                        onChange={(e) => setInputValue("merchantCode", e.target.value)}
                                        endAdornment={
                                            <IconButton onClick={handleClickShowPassword}>
                                              {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                          }
                                    />
                                </FormControl>
                            </Stack>
                        </Grid>
                        <Grid size={8}>
                            <Stack spacing={1}>
                                <InputLabel htmlFor="merchantkey">Merchant Key</InputLabel>
                                <FormControl fullWidth variant="outlined">
                                    <OutlinedInput 
                                        id="merchantkey"
                                        name="merchantkey" 
                                        type= { showPassword ? "text" : "password"}  
                                        readOnly
                                        value={inputs['merchantKey']}
                                        onChange={(e) => setInputValue("merchantKey", e.target.value)}
                                        endAdornment={
                                            <IconButton onClick={handleClickShowPassword}>
                                              {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                          }
                                    />
                                </FormControl>
                            </Stack>
                        </Grid>
                    </Grid>
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                    <Button
                        size="small"
                        onClick={handleChangeKey}
                        endIcon={<SendIcon />}
                        loading={loading}
                        loadingPosition="end"
                        variant="contained"
                        >
                        <span>Change Key</span>
                    </Button>
                </CardActions>
            </Card>
        </>
    );
}

export default MerchantInfor;