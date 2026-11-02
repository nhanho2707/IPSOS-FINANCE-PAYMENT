import { ContentCopy, Visibility, VisibilityOff } from "@mui/icons-material";
import { Grid, IconButton, InputAdornment, TextField, Typography } from "@mui/material"
import { useState } from "react";
import { useToast } from "../contexts/ToastContext";

interface SecretTextBoxProps {
    label: string,
    value: string
}

const SecretTextBox: React.FC<SecretTextBoxProps> = ({label, value}) => {
    const [ show, setShow ] = useState(false);
    const { showToast } = useToast();
    
    const handleToggleVisibility = () => {
        setShow((prev) => !prev);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            showToast("Copied to clipboard");
        } catch (err) {
            showToast("Copy failed. Please copy it manually.", "error");
        }
    };

    return (
        <div style={{ marginBottom: "1rem" }}>
            <Typography variant="body2" gutterBottom>
                { label }
            </Typography>
            <TextField
                type = { show ? "text" : "password" }
                value = { value }
                fullWidth
                size="small"
                slotProps={{
                    input: {
                        readOnly: true, //chỉ hiển thị, không cho sửa
                        endAdornment:(
                            <InputAdornment position="end">
                                <IconButton onClick={handleToggleVisibility} aria-label={show ? "Hide value" : "Show value"}>
                                    {show ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                                <IconButton onClick={handleCopy} aria-label="Copy to clipboard">
                                    <ContentCopy />
                                </IconButton>
                            </InputAdornment>
                        ) 
                    }
                }}
            />
        </div>
    );
}

export default SecretTextBox;