import { MenuItem, OutlinedInput, Select, Typography } from "@mui/material";

interface Option {
    id: string | number;
    value: string | number;
}

interface MultiSelectProps{
    title: string,
    options: Option[];
    value: string | null;
    onChange: (value: string | number) => void
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    slotProps: {
        paper: {
            style: {
                maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
                width: 250,
            },
        },
    },
};

const MultiSelect: React.FC<MultiSelectProps> = ({
    title,
    options,
    value,
    onChange
}) => {
    return (
        <div style={{ marginBottom: "1rem" }}>
            <Typography variant="body2" gutterBottom>
                { title }
            </Typography>
            <Select
                fullWidth
                multiple
                value={value?.split(",")}
                onChange={() => {}}
                MenuProps={MenuProps}
            >
                {options.map((option) => (
                    <MenuItem
                        key={option.value}
                        value={option.id}
                        // style={getStyles(name, personName, theme)}
                    >
                        {option.value}
                    </MenuItem>
                ))}
            </Select>
        </div>
    )
}

export default MultiSelect;