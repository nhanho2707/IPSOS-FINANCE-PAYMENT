import "../../../assets/css/components.css";
import React, { useState, useEffect, useMemo } from "react";
import numeral from 'numeral';
import { Box, Card, IconButton, OutlinedInput, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow } from "@mui/material"
import { ListReportColumnsConfig } from "../tableconfigs/ListReportColumnsConfig";
import { Survey } from "../Panellist";
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import SlideShowModal from "../modals/SlideShowModal";
import InputAdornment from '@mui/material/InputAdornment';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import dayjs, { Dayjs } from 'dayjs';
import Grid from '@mui/material/Grid';
import { DatePicker, DatePickerProps } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';

export interface ListReportsProps {
    surveys: Survey[]
}

const ListReportsTable: React.FC<ListReportsProps> = ({surveys}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [ page, setPage ] = useState(0);
    const [ rowsPerPage, setRowsPerPage ] = React.useState(15);
    const [ isModalOpen, setIsModalOpen ] = useState(false);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    }

    const handleDateChange: DatePickerProps['onChange'] = (newDate) => {
        setSelectedDate(newDate);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleOpenSlideShowModal = () => {
        setIsModalOpen(true);
    }

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };
    
    const filteredSurveys = useMemo(() => {
        let filtered = surveys;
    
        // Filter by search term
        if (searchTerm) {
          filtered = filtered.filter((survey) =>
            survey.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        // Filter by selected date (exact day)
        if (selectedDate) {
            const selectedMonth = selectedDate.format('yyyy-MM');
            filtered = filtered.filter((survey) =>
                dayjs(survey.open_date).format('yyyy-MM') === selectedMonth
            );
        }
    
        return filtered;
      }, [searchTerm, selectedDate, surveys]);

    return (
        <Grid container spacing={3}>

            <Grid size={{ lg: 12, md: 12, xs: 12 }}>
                <Card sx={{ p: 2, display: "flex", flexDirection: "row", gap: 10, justifyContent: "stretch", alignItems: "center" }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DesktopDatePicker
                        views={['year', 'month', 'day']}
                        label="Select Date"
                        value={selectedDate}
                        onChange={handleDateChange}
                    />
                    </LocalizationProvider>
                    <OutlinedInput
                        value={searchTerm}
                        onChange={handleSearchChange}
                        placeholder="Search Product"
                        startAdornment={
                            <InputAdornment position="start">
                                <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
                            </InputAdornment>
                        }
                        sx={{ width: '80%', }}
                    />
                </Card>
            </Grid>
            <Grid size={{ lg: 12, md: 12, xs: 12 }}>
                <Paper sx={{width: '100%', mb: 2}}>
                    <TableContainer component={Paper} className="table-container">
                        <Table>
                            <TableHead>
                                <TableRow className="header-table">
                                    {
                                        ListReportColumnsConfig.map((column, key) => {
                                            return (
                                                <TableCell
                                                    key={column.name}
                                                    component='th'
                                                    id={column.name}
                                                    scope='col'
                                                    padding="none"
                                                    style={{ width: column.width }}
                                                    align="center"
                                                    className="table-row"
                                                >
                                                    {column.label}
                                                </TableCell>
                                            )
                                        })
                                    }
                                    <TableCell
                                        key='action'
                                        component='th'
                                        id='action'
                                        scope='col'
                                        padding="none"
                                        style={{ width: 200 }}
                                        align="center"
                                        className="table-cell"
                                        ></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {
                                    filteredSurveys.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((survey: any, index) => {
                                        return (
                                            <TableRow
                                                key={survey.id} 
                                                className="table-row"
                                                hover={true}   
                                            >
                                                {
                                                    ListReportColumnsConfig.map((column, index) => {
                                                        const valueFormat = column.type === 'number' ? ( column.name === 'respond_rate' ? 
                                                            (numeral(survey[column.name]).format('0.00%')) : survey[column.name]) 
                                                        : survey[column.name];
                                                        return (
                                                            <TableCell
                                                                key={column.name}
                                                                align={survey.type === 'number' ? 'left' : 'right'}
                                                                className="table-cell"
                                                            >
                                                                { valueFormat }
                                                            </TableCell>
                                                        )
                                                    })
                                                }
                                                <TableCell
                                                    key='action'
                                                    className="table-cell"
                                                >
                                                    <IconButton
                                                        aria-label="import_excel"
                                                        size="small"
                                                        onClick={() => handleOpenSlideShowModal()}
                                                    >
                                                        <AssessmentOutlinedIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                }
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[15, 20, 25]}
                        component='div'
                        count={surveys.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </Paper>
                <SlideShowModal openModal={isModalOpen} onClose={handleCloseModal} />
            </Grid>
        </Grid>
    );
}

export default ListReportsTable;