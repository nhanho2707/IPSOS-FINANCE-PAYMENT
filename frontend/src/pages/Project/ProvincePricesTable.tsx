import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { Autocomplete, Box, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { Button } from "@mui/material";
import ReusableTable from "../../components/Table/ReusableTable";
import { ColumnFormat } from "../../config/ColumnConfig";
import { ApiConfig } from "../../config/ApiConfig";
import LoadingButton from "@mui/lab/LoadingButton";

interface Province {
    id: number;
    name: string;
}

interface PriceRow {
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

const SAMPLE_TYPES = [
    'main', 'booster', 'non'
];

const PRICE_TYPES = [
    "main", "main_1", "main_2", "main_3", "main_4", "main_5",
    "booster", "booster_1", "booster_2", "booster_3", "booster_4", "booster_5",
    "non", "non_1", "non_2", "non_3", "non_4", "non_5",
];

type Props = {
    projectId: number;
    canEdit: boolean;
};

const ProvincePricesTable = ({ projectId, canEdit }: Props) => {
    const [rows, setRows] = useState<PriceRow[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [loading, setLoading] = useState(false);

    const initialProvincePriceData: PriceRow = {
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

    const [ provincePriceData, setProvincePriceData ] = useState<PriceRow>(initialProvincePriceData);

    const [draftProvince, setDraftProvince] = useState<Province | null>(null);
    const [draftType, setDraftType] = useState<string | null>(null);
    const [draftPrice, setDraftPrice] = useState("");
    const [adding, setAdding] = useState(false);

    const [ openCreateProvincePriceDialog, setOpenCreateProvincePriceDialog ] = useState<boolean>(false);

    const token = localStorage.getItem("authToken");
    const headers = { Authorization: `Bearer ${token}` };

    const fetchPrices = useCallback(async () => {
        setLoading(true);
        try {
            const url = ApiConfig.project.getProjectPrices.replace("{projectId}", projectId.toString());
            const res = await axios.get(url, { headers });
            setRows(res.data.data ?? []);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchPrices();
        axios.get(ApiConfig.administrative.getProvinces, { headers })
            .then(res => setProvinces(res.data.data ?? []))
            .catch(console.log);
    }, [fetchPrices]);

    const columns: ColumnFormat[] = [
        { label: "Tỉnh thành", name: "province_name", type: "string", flex: 2 },
        { label: "Sample Size", name: "sample_size", type: "number", flex: 1
        },
        { label: "Loại Đơn giá", name: "price_type", type: "string", flex: 1 },
        {
            label: "Đơn giá (VNĐ)",
            name: "price",
            type: "number",
            flex: 1,
            renderCell: (row: PriceRow) => row.price.toLocaleString("vi-VN"),
        },
        {
            label: "Đơn giá 1 (VNĐ)",
            name: "price_1",
            type: "number",
            flex: 1,
            renderCell: (row: PriceRow) => row.price_1.toLocaleString("vi-VN"),
        },
        {
            label: "Đơn giá 2 (VNĐ)",
            name: "price_2",
            type: "number",
            flex: 1,
            renderCell: (row: PriceRow) => row.price_2.toLocaleString("vi-VN"),
        },
        {
            label: "Đơn giá 3 (VNĐ)",
            name: "price_3",
            type: "number",
            flex: 1,
            renderCell: (row: PriceRow) => row.price_3.toLocaleString("vi-VN"),
        },
        {
            label: "Đơn giá 4 (VNĐ)",
            name: "price_4",
            type: "number",
            flex: 1,
            renderCell: (row: PriceRow) => row.price_4.toLocaleString("vi-VN"),
        },
        {
            label: "Đơn giá 5 (VNĐ)",
            name: "price_5",
            type: "number",
            flex: 1,
            renderCell: (row: PriceRow) => row.price_5.toLocaleString("vi-VN"),
        },
        ...(canEdit ? [{
            label: "",
            name: "actions",
            type: "menu" as const,
            align: "center" as const,
            width: 60,
            renderAction: (row: PriceRow) => (
                <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
                    <DeleteIcon fontSize="small" />
                </IconButton>
            ),
        }] : []),
    ];

    const PRICE_CHAIN: (keyof PriceRow)[] = ["sample_size", "price", "price_1", "price_2", "price_3", "price_4", "price_5"];

    const handleProvincePriceDataChange = (field: keyof PriceRow, value: any) => {
        setProvincePriceData((prev) => {
            const next: PriceRow = { ...prev, [field]: value };

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
        setOpenCreateProvincePriceDialog(false);
    }

    const handleAddProvincePrice = async () => {
        
        setAdding(true);
        
        try {
            const url = ApiConfig.project.upsertProjectPrice.replace("{projectId}", projectId.toString());
            
            const res = await axios.put(url, {
                province_price: provincePriceData
            }, { headers });
            const saved: PriceRow = res.data.data;
            setRows(prev => {
                const idx = prev.findIndex(r => r.province_id === saved.province_id && r.price_type === saved.price_type);
                if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = saved;
                    return next;
                }
                return [...prev, saved];
            });
            setDraftProvince(null);
            setDraftType(null);
            setDraftPrice("");
        } catch (e) {
            console.log(e);
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (row: PriceRow) => {
        try {
            const url = ApiConfig.project.deleteProjectPrice.replace("{projectId}", projectId.toString());
            await axios.delete(url, { headers, data: { province_id: row.province_id, price_type: row.price_type } });
            setRows(prev => prev.filter(r => !(r.province_id === row.province_id && r.price_type === row.price_type)));
        } catch (e) {
            console.log(e);
        }
    };

    return (
        <Box>
            <ReusableTable
                title="Đơn giá theo tỉnh thành"
                columns={columns}
                data={rows}
                actionStatus={{ type: loading ? "fetch" : "idle", loading, error: false, message: "" }}
                topToolbar={canEdit ? (
                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
                        <Button
                            className="btn"
                            startIcon={<AddIcon />}
                            onClick={() => setOpenCreateProvincePriceDialog(true)}
                        >
                            {adding ? "Saving..." : "Add"}
                        </Button>
                    </Box>
                ) : undefined}
            />
            <Dialog open={openCreateProvincePriceDialog} onClose={handleCloseCreateProvincePriceDialog} maxWidth="sm">
                <DialogTitle>Thêm đơn giá theo tỉnh thành</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{mt: 1}}>
                        <Autocomplete
                            size="small"
                            options={provinces}
                            value={provincePriceData.province}
                            getOptionLabel={(o) => o.name}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            onChange={(_, v) => handleProvincePriceDataChange("province", v)}
                            sx={{ minWidth: 220 }}
                            renderInput={(params) => <TextField {...params} label="Tỉnh thành" />}
                        />
                        <Autocomplete
                            size="small"
                            options={SAMPLE_TYPES}
                            value={provincePriceData.price_type}
                            onChange={(_, v) => handleProvincePriceDataChange("price_type",v)}
                            sx={{ minWidth: 220 }}
                            renderInput={(params) => <TextField {...params} label="Loại Đơn giá" />}
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
                            label="Đơn giá quà 1"
                            type="number"
                            disabled={provincePriceData.sample_size == 0}
                            value={provincePriceData.price}
                            onChange={(e) => handleProvincePriceDataChange("price", e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ minWidth: 220 }}
                        />
                        <TextField
                            size="small"
                            label="Đơn giá quà 2"
                            type="number"
                            disabled={provincePriceData.price == 0}
                            value={provincePriceData.price_1}
                            onChange={(e) => handleProvincePriceDataChange("price_1", e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ minWidth: 220 }}
                        />
                        <TextField
                            size="small"
                            label="Đơn giá quà 3"
                            type="number"
                            disabled={provincePriceData.price_1 == 0}
                            value={provincePriceData.price_2}
                            onChange={(e) => handleProvincePriceDataChange("price_2", e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ minWidth: 220 }}
                        />
                        <TextField
                            size="small"
                            label="Đơn giá quà 4" 
                            type="number"
                            disabled={provincePriceData.price_2 == 0}
                            value={provincePriceData.price_3}
                            onChange={(e) => handleProvincePriceDataChange("price_3", e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ minWidth: 220 }}
                        />
                        <TextField
                            size="small"
                            label="Đơn giá quà 5"
                            type="number"
                            disabled={provincePriceData.price_3 == 0}
                            value={provincePriceData.price_4}
                            onChange={(e) => handleProvincePriceDataChange("price_4", e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ minWidth: 220 }}
                        />
                        <TextField
                            size="small"
                            label="Đơn giá quà 6"
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
                        loading={loading}
                        loadingPosition="end"
                        variant="contained"
                        disabled={!isCreateValid}
                        className='btn bg-vinnet-primary'
                        >
                            <span>CREATE</span>
                    </LoadingButton>
                </DialogActions>
            </Dialog>
        </Box>  
    );
};

export default ProvincePricesTable;
