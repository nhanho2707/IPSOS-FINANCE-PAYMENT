import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { useState } from 'react';
import { DateView } from '@mui/x-date-pickers/models';
import { Typography } from '@mui/material';

interface SearchDatePickerProps {
    title?: string,
    name: string,
    views?: DateView[],
    value: Dayjs | null,
    onSearchChange: (name: string, value: Dayjs | null) => void
}

const SearchDatePicker: React.FC<SearchDatePickerProps> = ({title="", name,  views=['year', 'month'], value=dayjs(), onSearchChange}) => {
    const [ selectedDate, setSelectedDate ] = useState<Dayjs | null>(value);

    const handleDateChange = (value: Dayjs | null) => {
        setSelectedDate(value);
        onSearchChange(name, value);
    }

    return(
        <div style={{display: "flex", gap: "0.5rem", alignItems: "center", width: "16rem"}}>
            <Typography variant='body2' color="text.secondary">{title}</Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DesktopDatePicker
                    views={views}
                    value={selectedDate}
                    onChange={handleDateChange}
                    sx={{
                        width: '18rem',
                        '& .MuiInputBase-root': {
                            height: '2.5rem',   // 👈 chiều cao tổng thể
                            fontSize: '1.0rem',
                        },
                        '& .MuiInputBase-input::placeholder': {
                            fontSize: '0.8rem', // 👈 chỉnh cỡ chữ placeholder
                            opacity: 1,         // nếu placeholder quá mờ, tăng độ rõ
                        },
                        '& .MuiSvgIcon-root': {
                            fontSize: '1.0rem',   // 👈 chỉnh kích thước icon
                        },
                    }}
                />
            </LocalizationProvider>
        </div>
    )
}

export default SearchDatePicker;

