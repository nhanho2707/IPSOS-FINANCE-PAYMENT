import { AlignHorizontalLeftRounded } from "@mui/icons-material";
import { Button, Checkbox, Dialog, DialogContent, DialogTitle, FormControlLabel, TextField, Typography} from "@mui/material";
import { useState } from "react";

interface TicketMultiSelectProps {
    label: string,
    titleDialog: string,
    options: {value: number, label: string}[],
    selected_items: number[],
    // onChange: (selected: number[]) => void
}

const TicketMultiSelect: React.FC<TicketMultiSelectProps> = ({label, titleDialog, options, selected_items}) => {
    
    const [ open, setOpen ] = useState<boolean>(false); 

    const handleToggle = (value: number) => {
        // if(selected_items.includes(value)){
        //     onChange(selected_items.filter((v) => v !== value));
        // } else {
        //     onChange([...selected_items, value]);
        // }
    };

    return (
        <div style={{display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Typography variant="body2" gutterBottom>
                {label}
            </Typography>
            <TextField
                value = { selected_items.join(", ") }
                fullWidth
                slotProps={{
                    input: {
                        readOnly: true
                    }
                }}
            ></TextField>

            <Button
                variant="contained"
                onClick={() => setOpen(true)}
            >
                <span>Select...</span>
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>
                    {titleDialog}
                </DialogTitle>
                <DialogContent>
                    {options.map( (option) => (
                        <FormControlLabel
                            key={option.value}
                            control={
                                <Checkbox
                                    checked={selected_items.includes(option.value)}
                                    onChange={() => handleToggle(option.value)}
                                />
                            }
                            label={option.label}
                        />
                    ))}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default TicketMultiSelect;