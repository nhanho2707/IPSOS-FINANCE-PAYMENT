import SearchIcon from "@mui/icons-material/Search";
import { InputAdornment, TextField } from "@mui/material"
import React, { useState } from "react";

interface SearchTextBoxProps {
    placeholder?: string,
    onSearchChange: (value: string)=> void
}

const SearchTextBox: React.FC<SearchTextBoxProps> = ({placeholder = "Search...", onSearchChange}) => {
    const [ search, setSearch ] = useState("");

    const hanleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearch(value);
        onSearchChange(value);
    }

    return (
        <div style={{display: "flex", gap: "0.5rem", alignItems: "center", width: "20rem" }}>
            <TextField
                value={search}
                onChange={hanleChange}
                placeholder={placeholder ?? "Search..."}
                variant="outlined"
                size="small"
                fullWidth
                sx={{
                    width: '20rem',
                    '& .MuiInputBase-input::placeholder': {
                    fontSize: '0.8rem', // 👈 chỉnh cỡ chữ placeholder
                    opacity: 1,         // nếu placeholder quá mờ, tăng độ rõ
                    },
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
            >

            </TextField>
        </div>
    )
}

export default SearchTextBox;