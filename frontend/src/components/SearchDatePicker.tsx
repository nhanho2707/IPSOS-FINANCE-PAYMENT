import dayjs, { Dayjs } from 'dayjs';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { useState } from 'react';
import { DateView } from '@mui/x-date-pickers/models';
import { Stack, Typography } from '@mui/material';

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
        <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant='body2' color="text.secondary">{title}</Typography>
            <DesktopDatePicker
                views={views}
                value={selectedDate}
                onChange={handleDateChange}
                slotProps={{ textField: { size: "small" } }}
                sx={{ width: 176 }}
            />
        </Stack>
    )
}

export default SearchDatePicker;
