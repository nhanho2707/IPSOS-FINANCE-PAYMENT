import { Box, Button, Card, TextField, Typography } from "@mui/material";
import axios from "axios";
import { useState } from "react";
import { ApiConfig } from "../../config/ApiConfig";

interface CustomVoucherData {
    employee_id: string,
    phone_number: string
}

export default function CustomVoucherLog(){
    
    const [ loading, setLoading ] = useState(false);
    const [ qrBase64, setQrBase64 ] = useState<string | null>(null);
    const [ message, setMessage ] = useState("");

    const [ formValues, setFormValues ] = useState<CustomVoucherData>({
        employee_id: "",
        phone_number: ""
    });

    const handleChange = (name: string, value: string) => {
        setFormValues((prev:any) => ({
            ...prev,
            [name]: value
        }));

        setQrBase64(null);
        setMessage("");
    } 

    const handleClick = async () => {
        setLoading(true);
        setMessage("");
        setQrBase64(null);

        try{
            const res = await axios.post(ApiConfig.customvoucher.searchLink, formValues);

            if(res.data.status_code == 200){
                setQrBase64(res.data.qr);

            } else {
                setMessage(res.data.error);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                py: 8,
                px: 2,
                backgroundColor: "#f5f5f5",
            }}
        >
            <Card
                sx={{
                    maxWidth: 400,
                    width: "100%",
                    p: 3,
                    boxShadow: 3,
                    borderRadius: 2
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2
                    }}
                >
                    <Typography variant="h6" sx={{ textAlign: "center" }}>Nhập Thông Tin</Typography>
                    <Box>
                        <Typography variant="body2" gutterBottom>
                            Mã số PVV
                        </Typography>
                        <TextField
                            fullWidth
                            autoComplete="off"
                            size="small"
                            type="string"
                            value={formValues['employee_id']}
                            variant="outlined"
                            onChange={(e) => handleChange("employee_id", e.target.value)}
                        />
                    </Box>
                    <Box>
                        <Typography variant="body2" gutterBottom>
                            Số điện thoại đáp viên
                        </Typography>
                        <TextField
                            fullWidth
                            autoComplete="off"
                            size="small"
                            type="string"
                            value={formValues['phone_number']}
                            variant="outlined"
                            onChange={(e) => handleChange("phone_number", e.target.value)}
                        />
                    </Box>
                    <Box>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleClick}
                            disabled={loading}
                            sx={{ mb: 2 }}
                        >
                            {loading ? "Đang xử lý..." : "Tìm Thông Tin"}
                        </Button>
                    </Box>
                </Box>
                {message && (
                    <Typography
                    variant="body1"
                    color="error"
                    align="center"
                    sx={{ mb: 2 }}
                    >
                    {message}
                    </Typography>
                )}
                {qrBase64 && (
                    <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
                        <img
                        src={`data:image/png;base64,${qrBase64}`}
                        alt="Voucher QR Code"
                        style={{ width: "200px", height: "200px" }}
                        />
                    </Box>
                )}
            </Card>
        </Box>
    );
}