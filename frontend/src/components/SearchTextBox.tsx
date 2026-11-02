import SearchIcon from "@mui/icons-material/Search";
import { InputAdornment, TextField } from "@mui/material"
import React, { useState } from "react";

interface SearchTextBoxProps {
    placeholder?: string,
    onSearchChange: (value: string)=> void
}

const SearchTextBox: React.FC<SearchTextBoxProps> = ({placeholder = "Search...", onSearchChange}) => {
    const [ search, setSearch ] = useState("");

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearch(value);
        onSearchChange(value);
    }

    return (
        <TextField
            value={search}
            onChange={handleChange}
            placeholder={placeholder}
            size="small"
            sx={{ width: "20rem", maxWidth: "100%", "& .MuiInputBase-input": { typography: "body2" } }}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                    </InputAdornment>
                ),
            }}
        />
    )
}

export default SearchTextBox;
