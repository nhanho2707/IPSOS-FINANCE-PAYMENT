import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Alert, Autocomplete, Box, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { Button } from "@mui/material";
import ReusableTable, { ActionState } from "../../components/Table/ReusableTable";
import { formatNumber } from "../../utils/format";
import ConfirmDialog from "../../components/Dialogs/ConfirmDialog";
import { ColumnFormat } from "../../config/ColumnConfig";
import { ApiConfig } from "../../config/ApiConfig";
import LoadingButton from "@mui/lab/LoadingButton";

interface Province {
    id: number;
    name: string;
}

interface PriceForm {
    province: Province | null;
    price_type: string,
    sample_size: number
    price: number;
    price_1: number;
    price_2: number;
    price_3: number;
    price_4: number;
    price_5: number;
}

interface PriceRow {
    province_id: number;
    province_name: string;
    price_type: string;
    sample_size: number;
    price: number;
    price_1: number;
    price_2: number;
    price_3: number;
    price_4: number;
    price_5: number;
}

type PriceImportItem = Omit<PriceRow, "province_name">;

const SAMPLE_TYPES = [
    'main', 'booster', 'non'
];

const PRICE_FIELDS = ["price", "price_1", "price_2", "price_3", "price_4", "price_5"] as const;

type PriceField = typeof PRICE_FIELDS[number];

const EXCEL_PROVINCE = "Tỉnh thành";
const EXCEL_PRICE_TYPE = "Loại Đơn giá";
const EXCEL_SAMPLE_SIZE = "Sample Size";
const EXCEL_PRICE_HEADERS: Record<PriceField, string> = {
    price: "Đơn giá quà 1",
    price_1: "Đơn giá quà 2",
    price_2: "Đơn giá quà 3",
    price_3: "Đơn giá quà 4",
    price_4: "Đơn giá quà 5",
    price_5: "Đơn giá quà 6",
};
const EXCEL_HEADERS = [EXCEL_PROVINCE, EXCEL_PRICE_TYPE, EXCEL_SAMPLE_SIZE, ...PRICE_FIELDS.map((f) => EXCEL_PRICE_HEADERS[f])];
const EXCEL_REQUIRED_HEADERS = [EXCEL_PROVINCE, EXCEL_PRICE_TYPE, EXCEL_SAMPLE_SIZE, EXCEL_PRICE_HEADERS.price];

const normalizeProvinceName = (name: string) => name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

// Cells may hold numbers or text such as "50.000" / "50,000"; VND amounts have no decimals,
// so separators are dropped. Returns null when the cell is not a non-negative amount.
const parseAmount = (value: unknown): number | null => {
    if (typeof value === "number") {
        return Number.isFinite(value) && value >= 0 ? value : null;
    }

    const text = String(value ?? "").replace(/[\s.,]/g, "");
    if (text === "") return 0;

    return /^\d+$/.test(text) ? Number(text) : null;
};

type Props = {
    projectId: number;
    canEdit: boolean;
};

const ProvincePricesTable = ({ projectId, canEdit }: Props) => {
    const [rows, setRows] = useState<PriceRow[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [loading, setLoading] = useState(false);

    const initialProvincePriceData: PriceForm = {
        province: null,
        price_type: "",
        sample_size: 0,
        price: 0,
        price_1: 0,
        price_2: 0,
        price_3: 0,
        price_4: 0,
        price_5: 0
    };

    const [ provincePriceData, setProvincePriceData ] = useState<PriceForm>(initialProvincePriceData);

    const [adding, setAdding] = useState(false);
    const [formError, setFormError] = useState("");
    const [rowToDelete, setRowToDelete] = useState<PriceRow | null>(null);
    const [actionState, setActionState] = useState<ActionState>({
        type: 'idle',
        loading: false,
        error: false,
        message: ""
    });

    const [ openCreateProvincePriceDialog, setOpenCreateProvincePriceDialog ] = useState<boolean>(false);

    const [importing, setImporting] = useState(false);
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const token = localStorage.getItem("authToken");
    const headers = { Authorization: `Bearer ${token}` };

    const fetchPrices = useCallback(async () => {
        setLoading(true);
        try {
            const url = ApiConfig.project.getProjectPrices.replace("{projectId}", projectId.toString());
            const res = await axios.get(url, { headers });
            setRows(res.data.data ?? []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchPrices();
        axios.get(ApiConfig.administrative.getProvinces, { headers })
            .then(res => setProvinces(res.data.data ?? []))
            .catch(console.error);
    }, [fetchPrices]);

    const columns: ColumnFormat[] = [
        { label: "Province", name: "province_name", type: "string", flex: 2 },
        { label: "Sample Size", name: "sample_size", type: "number", flex: 1
        },
        { label: "Price type", name: "price_type", type: "string", flex: 1 },
        {
            label: "Price (VND)",
            name: "price",
            type: "number",
            flex: 1,
            renderCell: (row: PriceRow) => formatNumber(row.price),
        },
        {
            label: "Price 1 (VND)",
            name: "price_1",
            type: "number",
            flex: 1,
            renderCell: (row: PriceRow) => formatNumber(row.price_1),
        },
        {
            label: "Price 2 (VND)",
            name: "price_2",
            type: "number",
            flex: 1,
            renderCell: (row: PriceRow) => formatNumber(row.price_2),
        },
        {
            label: "Price 3 (VND)",
            name: "price_3",
            type: "number",
            flex: 1,
            renderCell: (row: PriceRow) => formatNumber(row.price_3),
        },
        {
            label: "Price 4 (VND)",
            name: "price_4",
            type: "number",
            flex: 1,
            renderCell: (row: PriceRow) => formatNumber(row.price_4),
        },
        {
            label: "Price 5 (VND)",
            name: "price_5",
            type: "number",
            flex: 1,
            renderCell: (row: PriceRow) => formatNumber(row.price_5),
        },
        ...(canEdit ? [{
            label: "",
            name: "actions",
            type: "menu" as const,
            align: "center" as const,
            width: 60,
            renderAction: (row: PriceRow) => (
                <IconButton size="small" color="error" onClick={() => setRowToDelete(row)}>
                    <DeleteIcon fontSize="small" />
                </IconButton>
            ),
        }] : []),
    ];

    const PRICE_CHAIN: (keyof PriceForm)[] = ["sample_size", "price", "price_1", "price_2", "price_3", "price_4", "price_5"];

    const handleProvincePriceDataChange = (field: keyof PriceForm, value: any) => {
        setProvincePriceData((prev) => {
            const next: PriceForm = { ...prev, [field]: value };

            if(field === 'province' || field === 'price_type'){
                if(!(next['province'] && next['price_type'])){
                    for(let i = 0; i < PRICE_CHAIN.length; i++) {
                        (next as any)[PRICE_CHAIN[i]] = 0;
                    }
                }
            } else {
                const chainIndex = PRICE_CHAIN.indexOf(field);
                const isZeroOrEmpty = value === "" || Number(value) === 0;

                if (chainIndex >= 0 && isZeroOrEmpty) {
                    for (let i = chainIndex + 1; i < PRICE_CHAIN.length; i++) {
                        (next as any)[PRICE_CHAIN[i]] = 0;
                    }
                }
            }

            return next;
        });
    }

    const isCreateValid =
        !!provincePriceData.province &&
        !!provincePriceData.price_type &&
        Number(provincePriceData.sample_size) > 0 &&
        [
            provincePriceData.price,
            provincePriceData.price_1,
            provincePriceData.price_2,
            provincePriceData.price_3,
            provincePriceData.price_4,
            provincePriceData.price_5,
        ].some((p) => Number(p) > 0);

    const handleCloseCreateProvincePriceDialog = () => {
        setProvincePriceData(initialProvincePriceData);
        setFormError("");
        setOpenCreateProvincePriceDialog(false);
    }

    const getErrorMessage = (error: unknown): string => {
        if (axios.isAxiosError(error)) {
            return error.response?.data?.message ?? error.message;
        }

        return "Something went wrong. Please try again.";
    }

    const handleAddProvincePrice = async () => {
        setAdding(true);
        setFormError("");

        try {
            const url = ApiConfig.project.upsertProjectPrice.replace("{projectId}", projectId.toString());

            const res = await axios.put(url, {
                province_id: provincePriceData.province?.id,
                price_type: provincePriceData.price_type,
                sample_size: Number(provincePriceData.sample_size),
                price: Number(provincePriceData.price),
                price_1: Number(provincePriceData.price_1),
                price_2: Number(provincePriceData.price_2),
                price_3: Number(provincePriceData.price_3),
                price_4: Number(provincePriceData.price_4),
                price_5: Number(provincePriceData.price_5),
            }, { headers });

            handleCloseCreateProvincePriceDialog();
            setActionState({ type: 'add', loading: false, error: false, message: res.data.message });
            await fetchPrices();
        } catch (e) {
            setFormError(getErrorMessage(e));
        } finally {
            setAdding(false);
        }
    };

    const handleExport = () => {
        const sheetRows = rows.map((row) => [
            row.province_name,
            row.price_type,
            row.sample_size,
            ...PRICE_FIELDS.map((f) => row[f]),
        ]);

        const worksheet = XLSX.utils.aoa_to_sheet([EXCEL_HEADERS, ...sheetRows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Province Prices");
        XLSX.writeFile(workbook, `province_prices_${projectId}.xlsx`);
    };

    const parseImportRows = (sheetRows: unknown[][]): { items: PriceImportItem[]; errors: string[] } => {
        const [headerRow = [], ...dataRows] = sheetRows;
        const headers = headerRow.map((h) => String(h).trim());

        const missingHeaders = EXCEL_REQUIRED_HEADERS.filter((h) => !headers.includes(h));
        if (missingHeaders.length > 0) {
            return { items: [], errors: [`The file is missing required columns: ${missingHeaders.join(", ")}`] };
        }

        const provinceByName = new Map(provinces.map((p) => [normalizeProvinceName(p.name), p]));
        const seenRows = new Map<string, number>();
        const items: PriceImportItem[] = [];
        const errors: string[] = [];

        dataRows.forEach((cells, index) => {
            const excelRow = index + 2;
            const cell = (header: string) => {
                const columnIndex = headers.indexOf(header);
                return columnIndex >= 0 ? cells[columnIndex] : "";
            };

            if (cells.every((c) => String(c ?? "").trim() === "")) return;

            const rowErrors: string[] = [];

            const provinceName = String(cell(EXCEL_PROVINCE) ?? "").trim();
            const province = provinceByName.get(normalizeProvinceName(provinceName));
            if (!province) {
                rowErrors.push(provinceName ? `province "${provinceName}" not found` : "province is missing");
            }

            const priceType = String(cell(EXCEL_PRICE_TYPE) ?? "").trim().toLowerCase();
            if (!SAMPLE_TYPES.includes(priceType)) {
                rowErrors.push(`price type must be one of ${SAMPLE_TYPES.join(", ")}`);
            }

            const sampleSize = parseAmount(cell(EXCEL_SAMPLE_SIZE));
            if (sampleSize === null || !Number.isInteger(sampleSize) || sampleSize <= 0) {
                rowErrors.push("sample size must be a whole number greater than 0");
            }

            const prices = {} as Record<PriceField, number>;
            PRICE_FIELDS.forEach((field, fieldIndex) => {
                const amount = parseAmount(cell(EXCEL_PRICE_HEADERS[field]));

                if (amount === null) {
                    rowErrors.push(`${EXCEL_PRICE_HEADERS[field]} is invalid`);
                    prices[field] = 0;
                    return;
                }

                prices[field] = amount;

                if (field === "price" && amount === 0) {
                    rowErrors.push(`${EXCEL_PRICE_HEADERS.price} must be greater than 0`);
                }

                const previousField = PRICE_FIELDS[fieldIndex - 1];
                if (previousField && amount > 0 && prices[previousField] === 0) {
                    rowErrors.push(`${EXCEL_PRICE_HEADERS[previousField]} must be filled in before ${EXCEL_PRICE_HEADERS[field]}`);
                }
            });

            if (province && SAMPLE_TYPES.includes(priceType)) {
                const key = `${province.id}|${priceType}`;
                const firstRow = seenRows.get(key);

                if (firstRow !== undefined) {
                    rowErrors.push(`same province and price type as row ${firstRow}`);
                } else {
                    seenRows.set(key, excelRow);
                }
            }

            if (rowErrors.length > 0 || !province || sampleSize === null) {
                errors.push(`Row ${excelRow}: ${rowErrors.join("; ")}`);
                return;
            }

            items.push({
                province_id: province.id,
                price_type: priceType,
                sample_size: sampleSize,
                ...prices,
            });
        });

        if (items.length === 0 && errors.length === 0) {
            errors.push("The file has no data.");
        }

        return { items, errors };
    };

    const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);

        try {
            const workbook = XLSX.read(await file.arrayBuffer());
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "", blankrows: false });

            const { items, errors } = parseImportRows(sheetRows);
            if (errors.length > 0) {
                setImportErrors(errors);
                return;
            }

            const url = ApiConfig.project.importProjectPrices.replace("{projectId}", projectId.toString());
            const res = await axios.post(url, { prices: items }, { headers });

            setActionState({ type: 'import', loading: false, error: false, message: res.data.message });
            await fetchPrices();
        } catch (e) {
            const validationErrors: Record<string, string[]> | undefined =
                axios.isAxiosError(e) ? e.response?.data?.errors : undefined;

            setImportErrors(validationErrors ? Object.values(validationErrors).flat() : [getErrorMessage(e)]);
        } finally {
            setImporting(false);
            event.target.value = "";
        }
    };

    const handleConfirmDelete = async () => {
        if (!rowToDelete) return;

        const row = rowToDelete;
        setRowToDelete(null);

        try {
            const url = ApiConfig.project.deleteProjectPrice.replace("{projectId}", projectId.toString());
            const res = await axios.delete(url, { headers, data: { province_id: row.province_id, price_type: row.price_type } });

            setActionState({ type: 'delete', loading: false, error: false, message: res.data.message });
            await fetchPrices();
        } catch (e) {
            setActionState({ type: 'delete', loading: false, error: true, message: getErrorMessage(e) });
        }
    };

    // All prices arrive in one response, so the table pages through them locally.
    const lastPage = Math.max(0, Math.ceil(rows.length / rowsPerPage) - 1);
    const currentPage = Math.min(page, lastPage);
    const pagedRows = rows.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);

    return (
        <Box>
            <ReusableTable
                columns={columns}
                data={pagedRows}
                actionStatus={{ ...actionState, loading }}
                total={rows.length}
                page={currentPage}
                rowsPerPage={rowsPerPage}
                onPageChange={(_event, newPage) => setPage(newPage)}
                onRowsPerPageChange={(event) => {
                    setRowsPerPage(parseInt(event.target.value, 10));
                    setPage(0);
                }}
                topToolbar={
                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
                        {canEdit && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setOpenCreateProvincePriceDialog(true)}
                            >
                                {adding ? "Saving..." : "Add"}
                            </Button>
                        )}
                        {canEdit && (
                            <Button
                                variant="outlined"
                                color="inherit"
                                startIcon={<FileUploadIcon />}
                                disabled={importing}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {importing ? "Importing..." : "Import"}
                            </Button>
                        )}
                        <Button
                            variant="outlined"
                            color="inherit"
                            startIcon={<FileDownloadIcon />}
                            onClick={handleExport}
                        >
                            Export
                        </Button>
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={handleImportFile}
                        />
                    </Box>
                }
            />
            <Dialog open={openCreateProvincePriceDialog} onClose={handleCloseCreateProvincePriceDialog} maxWidth="sm">
                <DialogTitle>Add province price</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{mt: 1}}>
                        {formError && <Alert severity="error">{formError}</Alert>}
                        <Autocomplete
                            size="small"
                            options={provinces}
                            value={provincePriceData.province}
                            getOptionLabel={(o) => o.name}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            onChange={(_, v) => handleProvincePriceDataChange("province", v)}
                            sx={{ minWidth: 220 }}
                            renderInput={(params) => <TextField {...params} label="Province" />}
                        />
                        <Autocomplete
                            size="small"
                            options={SAMPLE_TYPES}
                            value={provincePriceData.price_type}
                            onChange={(_, v) => handleProvincePriceDataChange("price_type",v)}
                            sx={{ minWidth: 220 }}
                            renderInput={(params) => <TextField {...params} label="Price type" />}
                        />
                        <TextField
                            size="small"
                            label="Sample Size"
                            type="number"
                            disabled={!provincePriceData.province || !provincePriceData.price_type}
                            value={provincePriceData.sample_size}
                            onChange={(e) => handleProvincePriceDataChange("sample_size", e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ minWidth: 220 }}

                        />
                        <TextField
                            size="small"
                            label="Gift price 1"
                            type="number"
                            disabled={provincePriceData.sample_size == 0}
                            value={provincePriceData.price}
                            onChange={(e) => handleProvincePriceDataChange("price", e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ minWidth: 220 }}
                        />
                        <TextField
                            size="small"
                            label="Gift price 2"
                            type="number"
                            disabled={provincePriceData.price == 0}
                            value={provincePriceData.price_1}
                            onChange={(e) => handleProvincePriceDataChange("price_1", e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ minWidth: 220 }}
                        />
                        <TextField
                            size="small"
                            label="Gift price 3"
                            type="number"
                            disabled={provincePriceData.price_1 == 0}
                            value={provincePriceData.price_2}
                            onChange={(e) => handleProvincePriceDataChange("price_2", e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ minWidth: 220 }}
                        />
                        <TextField
                            size="small"
                            label="Gift price 4" 
                            type="number"
                            disabled={provincePriceData.price_2 == 0}
                            value={provincePriceData.price_3}
                            onChange={(e) => handleProvincePriceDataChange("price_3", e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ minWidth: 220 }}
                        />
                        <TextField
                            size="small"
                            label="Gift price 5"
                            type="number"
                            disabled={provincePriceData.price_3 == 0}
                            value={provincePriceData.price_4}
                            onChange={(e) => handleProvincePriceDataChange("price_4", e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ minWidth: 220 }}
                        />
                        <TextField
                            size="small"
                            label="Gift price 6"
                            type="number"
                            disabled={provincePriceData.price_4 == 0}
                            value={provincePriceData.price_5}
                            onChange={(e) => handleProvincePriceDataChange("price_5", e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ minWidth: 220 }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCreateProvincePriceDialog}>Cancel</Button>
                    <LoadingButton
                        onClick={handleAddProvincePrice}
                        size="small"
                        loading={adding}
                        loadingPosition="end"
                        variant="contained"
                        disabled={!isCreateValid}
                        >
                            <span>Create</span>
                    </LoadingButton>
                </DialogActions>
            </Dialog>

            <Dialog open={importErrors.length > 0} onClose={() => setImportErrors([])} fullWidth maxWidth="sm">
                <DialogTitle>Price import failed</DialogTitle>
                <DialogContent>
                    <Alert severity="error" sx={{ mb: 1 }}>
                        No prices were saved. Please fix the file and import again.
                    </Alert>
                    <Box component="ul" sx={{ pl: 3, m: 0 }}>
                        {importErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setImportErrors([])}>Close</Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={rowToDelete !== null}
                onClose={() => setRowToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete price"
                tone="danger"
                confirmText="Delete"
                
                message={rowToDelete ? `Are you sure you want to delete the "${rowToDelete.price_type}" price for ${rowToDelete.province_name}?` : ""}
            />
        </Box>  
    );
};

export default ProvincePricesTable;
