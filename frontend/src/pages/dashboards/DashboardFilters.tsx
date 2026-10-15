import React from 'react';
import { Autocomplete, Card, Checkbox, Grid, TextField } from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

export interface DashboardFilterState {
    cities: string[];
    users: string[];
    needstates: string[];
    weights: string[];
}

interface DashboardFiltersProps {
    cityOptions: string[];
    userOptions: string[];
    needstateOptions: string[];
    weightOptions: string[];
    value: DashboardFilterState;
    onChange: (value: DashboardFilterState) => void;
}

const checkboxIcon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkboxCheckedIcon = <CheckBoxIcon fontSize="small" />;

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
    cityOptions,
    userOptions,
    needstateOptions,
    weightOptions,
    value,
    onChange
}) => {
    const renderMultiSelect = (
        label: string,
        options: string[],
        selected: string[],
        onSelectedChange: (next: string[]) => void
    ) => (
        <Autocomplete
            multiple
            disableCloseOnSelect
            size="small"
            options={options}
            value={selected}
            onChange={(event, newValue) => onSelectedChange(newValue)}
            renderOption={(props, option, { selected: isSelected }) => (
                <li {...props}>
                    <Checkbox
                        icon={checkboxIcon}
                        checkedIcon={checkboxCheckedIcon}
                        checked={isSelected}
                        style={{ marginRight: 8 }}
                    />
                    {option}
                </li>
            )}
            renderInput={(params) => (
                <TextField {...params} label={label} placeholder="Tất cả" />
            )}
        />
    );

    return (
        <Card sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                    {renderMultiSelect('Thành phố', cityOptions, value.cities, (cities) => onChange({ ...value, cities }))}
                </Grid>
                <Grid item xs={12} sm={3}>
                    {renderMultiSelect('Users', userOptions, value.users, (users) => onChange({ ...value, users }))}
                </Grid>
                <Grid item xs={12} sm={3}>
                    {renderMultiSelect('Needstate', needstateOptions, value.needstates, (needstates) => onChange({ ...value, needstates }))}
                </Grid>
                <Grid item xs={12} sm={3}>
                    {renderMultiSelect('Weights', weightOptions, value.weights, (weights) => onChange({ ...value, weights }))}
                </Grid>
            </Grid>
        </Card>
    );
};

export default DashboardFilters;
