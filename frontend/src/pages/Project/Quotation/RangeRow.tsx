import { Box, TableCell, TableRow, TextField } from "@mui/material";
import { range } from "d3";
import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export interface RangeType {
    from: number,
    to: number
}

type Props = {
    row: {
        id: string,
        label: string,
        value: RangeType
    },
    isEditing: boolean,
    onChange: (id: string, value: RangeType) => void
}

const RangeRow = memo(({row, isEditing, onChange}: Props) => {
    const { t } = useTranslation();
    const [ rangeData, setRangeData ] = useState<RangeType>(row.value || {});

    const handleRangeChange = (key: string, value: number) => {
        const newRange = {
            ...rangeData,
            [key]: value
        };

        setRangeData(newRange);

        onChange(row.id, newRange);
    };

    useEffect(() => {
        setRangeData(row.value || {});
    }, [row.value]);

    const renderFromTo = (from?: string | number, to?: string | number) => {
        const hasFrom = from !== null && from !== undefined && from !== "";
        const hasTo = to !== null && to !== undefined && to !== "";

        if(hasFrom && hasTo) {
            return `${from} - ${to}`;
        } 

        if(hasFrom){
            return `${from}`;
        }

        if(hasTo){
            return `${to}`;
        }
    }

    return (
        <TableRow>
            <TableCell 
                width={200}
                sx={{
                    fontWeight: 600
                }}
            >
                {row.label}
            </TableCell>
            <TableCell>
                {isEditing ? (
                    <Box
                        sx={{
                            display: "flex",
                            gap: 2,
                            mt: 1
                        }}
                    >
                        <TextField
                            fullWidth
                            autoFocus
                            size="small"
                            type="number"
                            label={t("quotation.form.from")}
                            disabled={!isEditing}
                            value={rangeData.from || ""}
                            onChange={(e) => handleRangeChange("from", Number(e.target.value))}
                        />
                        <TextField
                            fullWidth
                            autoFocus
                            size="small"
                            type="number"
                            label={t("quotation.form.to")}
                            disabled={!isEditing}
                            value={rangeData.to || ""}
                            onChange={(e) => handleRangeChange("to", Number(e.target.value))}
                        />
                    </Box>
                ) : (
                    renderFromTo(rangeData.from, rangeData.to)
                )}
                
            </TableCell>
        </TableRow>
    );
});

export default RangeRow;