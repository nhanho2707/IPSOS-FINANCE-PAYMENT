import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { IconButton, InputAdornment, SxProps, TextField, Theme } from "@mui/material"
import React, { useEffect, useRef, useState } from "react";

interface SearchTextBoxProps {
    placeholder?: string,
    onSearchChange: (value: string) => void,
    defaultValue?: string,
    debounceMs?: number,
    sx?: SxProps<Theme>,
}

// Every list hook fetches when its search term changes, so the term is only reported once typing pauses:
// fewer requests, and a slow response for "ab" cannot land after the one for "abc".
const SearchTextBox: React.FC<SearchTextBoxProps> = ({ placeholder = "Search...", onSearchChange, defaultValue = "", debounceMs = 300, sx }) => {
    const [ search, setSearch ] = useState(defaultValue);
    const timerRef = useRef<number | undefined>(undefined);
    const onSearchChangeRef = useRef(onSearchChange);

    useEffect(() => {
        onSearchChangeRef.current = onSearchChange;
    }, [onSearchChange]);

    useEffect(() => () => window.clearTimeout(timerRef.current), []);

    const report = (value: string, delay: number) => {
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => onSearchChangeRef.current(value), delay);
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearch(value);
        report(value, debounceMs);
    }

    const handleClear = () => {
        setSearch("");
        report("", 0);
    }

    return (
        <TextField
            value={search}
            onChange={handleChange}
            onKeyDown={(event) => {
                if (event.key === "Escape" && search) handleClear();
            }}
            placeholder={placeholder}
            size="small"
            inputProps={{ "aria-label": placeholder }}
            sx={[
                { width: "20rem", maxWidth: "100%", "& .MuiInputBase-input": { typography: "body2" } },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                    </InputAdornment>
                ),
                endAdornment: search ? (
                    <InputAdornment position="end">
                        <IconButton aria-label="Clear search" size="small" edge="end" onClick={handleClear}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </InputAdornment>
                ) : null,
            }}
        />
    )
}

export default SearchTextBox;
