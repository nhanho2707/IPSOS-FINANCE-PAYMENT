import { Button } from "@mui/material";
import dayjs, { Dayjs } from "dayjs"
import SearchDatePicker from "./SearchDatePicker"
import React, { useState } from "react"
import { DateView } from '@mui/x-date-pickers/models';

interface SearchDatePickerFromToProps {
    fromValue: Dayjs | null,
    toValue: Dayjs | null,
    views?: DateView[],
    buttonLabel?: string,
    buttonIcon?: React.ReactNode,
    loadingButton?: boolean,
    onSearchChange: (from: Dayjs | null, to: Dayjs | null) => void
}

const SearchDatePickerFromTo: React.FC<SearchDatePickerFromToProps> = ({
                                    fromValue=dayjs().startOf("year"), 
                                    toValue=dayjs().endOf("year"), 
                                    views=['year', 'month', 'day'],
                                    buttonLabel,
                                    buttonIcon,
                                    loadingButton,
                                    onSearchChange }) => {

    const [ fromDate, setFromDate ] = useState<Dayjs | null>(fromValue);
    const [ toDate, setToDate ] = useState<Dayjs | null>(toValue);

    const handleDateChange = (name: string, value: Dayjs | null) => {
        if(!value) return;

        if(name == "fromDate"){
            setFromDate(value);
        }
        if(name == "toDate"){
            setToDate(value)
        }
    }

    const handleFilter = () => {
        onSearchChange(fromDate, toDate);
    }

    const isApplyFilter = !fromDate || !toDate || (fromDate && toDate && fromDate.isAfter(toDate));
    
    return (
        <div style={{display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <SearchDatePicker title="From:" name= "fromDate" value={fromDate} views={views} onSearchChange={handleDateChange} />
            <SearchDatePicker title="To:" name= "toDate" value={toDate} views={views} onSearchChange={handleDateChange} />
            <Button
                onClick={handleFilter}
                size="small"
                startIcon={buttonIcon}
                loading={loadingButton}
                loadingPosition={buttonIcon ? "start" : "center"}
                variant="contained"
                disabled={isApplyFilter}
                >
                    <span>{buttonLabel ?? "Apply"}</span>
            </Button>
        </div>
    )
}

export default SearchDatePickerFromTo;