import React from "react";
import { TableSortLabel } from "@mui/material";
import { SortDirection } from "../../config/StatisticsConfig";

interface SortHeaderProps {
    label: string;
    active: boolean;
    direction: SortDirection;
    onClick: () => void;
    alignRight?: boolean;
}

// A column header that sorts the table; used through ColumnFormat.renderHeader.
const SortHeader: React.FC<SortHeaderProps> = ({ label, active, direction, onClick, alignRight = false }) => (
    <TableSortLabel
        active={active}
        direction={active ? direction : "asc"}
        onClick={onClick}
        sx={{ flexDirection: alignRight ? "row-reverse" : "row", "& .MuiTableSortLabel-icon": { fontSize: 16 } }}
    >
        {label}
    </TableSortLabel>
);

export default SortHeader;
