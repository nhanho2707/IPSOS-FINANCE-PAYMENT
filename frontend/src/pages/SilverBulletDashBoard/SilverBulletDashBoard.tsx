import { useEffect, useState } from 'react';
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    Chip,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import dayjs, { Dayjs } from 'dayjs';
import {
    calculateSilverBullet,
    computeSummaryRows,
    GainLossEntry,
    SilverBulletResult,
    RawDataPoint,
    SilverBulletMetadata,
    ComparisonLevel,
    COMPARISON_LEVEL_LABELS,
} from './silverBulletUtils';
import { ApiConfig } from '../../config/ApiConfig';
import axios from 'axios';

const HEADER_BG = '#003399';
const HEADER_TEXT = '#ffffff';
const GAIN_COLOR = '#2e7d32';
const LOSS_COLOR = '#c62828';
const GAIN_HEADER_BG = '#388e3c';
const LOSS_HEADER_BG = '#c62828';

const pickerSx = {
    '& .MuiInputBase-root': { height: '2.5rem', fontSize: '0.875rem' },
    '& .MuiSvgIcon-root': { fontSize: '1rem' },
};

function PeriodPicker({
    label,
    from,
    to,
    onFromChange,
    onToChange,
    minFrom,
    maxFrom,
    minTo,
    maxTo,
}: {
    label: string;
    from: Dayjs;
    to: Dayjs;
    onFromChange: (v: Dayjs | null) => void;
    onToChange: (v: Dayjs | null) => void;
    minFrom?: Dayjs;
    maxFrom?: Dayjs;
    minTo?: Dayjs;
    maxTo?: Dayjs;
}) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" fontWeight={600} color="text.secondary" minWidth={64}>
                {label}
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DesktopDatePicker
                    label="From"
                    value={from}
                    onChange={onFromChange}
                    format="YYYY-MM-DD"
                    minDate={minFrom}
                    maxDate={maxFrom}
                    sx={{ width: 160, ...pickerSx }}
                />
                <Typography variant="body2" color="text.secondary">—</Typography>
                <DesktopDatePicker
                    label="To"
                    value={to}
                    onChange={onToChange}
                    format="YYYY-MM-DD"
                    minDate={minTo}
                    maxDate={maxTo}
                    sx={{ width: 160, ...pickerSx }}
                />
            </LocalizationProvider>
        </Box>
    );
}

function SummaryTable({ result }: { result: SilverBulletResult }) {
    const rows = computeSummaryRows(result);
    const totalGrossGains = rows.reduce((s, r) => s + r.grossGains, 0);
    const totalGrossLosses = rows.reduce((s, r) => s + r.grossLosses, 0);
    const totalNet = totalGrossGains + totalGrossLosses;
    const maxPercent = Math.max(...rows.map(r => Math.abs(r.percentOfNet)), 1);
    const netLabel = `% of Net ${result.focusBrandFull} Growth`;

    return (
        <TableContainer component={Paper} elevation={2} sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontStyle: 'italic', fontWeight: 600, fontSize: '0.8rem', backgroundColor: '#f5f5f5', borderRight: '1px solid #e0e0e0' }}>
                            Source of volume change
                        </TableCell>
                        <TableCell align="center" sx={{ backgroundColor: GAIN_HEADER_BG, color: '#fff', fontWeight: 700, fontSize: '0.8rem', letterSpacing: 0.3 }}>
                            Gross Gains
                        </TableCell>
                        <TableCell align="center" sx={{ backgroundColor: LOSS_HEADER_BG, color: '#fff', fontWeight: 700, fontSize: '0.8rem', letterSpacing: 0.3 }}>
                            Gross Losses
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem', backgroundColor: '#f5f5f5' }}>
                            Net Contribution
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem', backgroundColor: '#f5f5f5' }}>
                            {netLabel}
                        </TableCell>
                        <TableCell sx={{ width: 150, backgroundColor: '#f5f5f5' }} />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, idx) => (
                        <TableRow key={idx} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                            <TableCell sx={{ fontSize: '0.875rem', borderRight: '1px solid #e0e0e0' }}>{row.source}</TableCell>
                            <TableCell align="center" sx={{ color: GAIN_COLOR, fontWeight: 600, fontSize: '0.875rem' }}>
                                {row.grossGains.toFixed(2)}
                            </TableCell>
                            <TableCell align="center" sx={{ color: LOSS_COLOR, fontWeight: 600, fontSize: '0.875rem' }}>
                                {row.grossLosses === 0 ? '0.00' : row.grossLosses.toFixed(2)}
                            </TableCell>
                            <TableCell align="center" sx={{ color: row.netContribution >= 0 ? GAIN_COLOR : LOSS_COLOR, fontWeight: 600, fontSize: '0.875rem' }}>
                                {row.netContribution.toFixed(2)}
                            </TableCell>
                            <TableCell align="center" sx={{ fontSize: '0.875rem', color: row.percentOfNet >= 0 ? GAIN_COLOR : LOSS_COLOR, fontWeight: 600 }}>
                                {row.percentOfNet >= 0 ? '+' : ''}{row.percentOfNet.toFixed(1)}%
                            </TableCell>
                            <TableCell sx={{ width: 150, px: 1 }}>
                                <Box sx={{ position: 'relative', height: 14, display: 'flex', alignItems: 'center' }}>
                                    {/* center axis */}
                                    <Box sx={{
                                        position: 'absolute',
                                        left: '50%',
                                        top: 0,
                                        bottom: 0,
                                        width: '1px',
                                        backgroundColor: '#bdbdbd',
                                        transform: 'translateX(-50%)',
                                    }} />
                                    {row.percentOfNet >= 0 ? (
                                        <Box sx={{
                                            position: 'absolute',
                                            left: '50%',
                                            height: 14,
                                            width: `${(row.percentOfNet / maxPercent) * 50}%`,
                                            backgroundColor: GAIN_COLOR,
                                            borderRadius: '0 2px 2px 0',
                                            minWidth: row.percentOfNet > 0 ? 3 : 0,
                                        }} />
                                    ) : (
                                        <Box sx={{
                                            position: 'absolute',
                                            right: '50%',
                                            height: 14,
                                            width: `${(Math.abs(row.percentOfNet) / maxPercent) * 50}%`,
                                            backgroundColor: LOSS_COLOR,
                                            borderRadius: '2px 0 0 2px',
                                            minWidth: 3,
                                        }} />
                                    )}
                                </Box>
                            </TableCell>
                        </TableRow>
                    ))}

                    <TableRow sx={{ borderTop: '2px solid #bdbdbd', backgroundColor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem', borderRight: '1px solid #e0e0e0' }}>TOTAL</TableCell>
                        <TableCell align="center" sx={{ color: GAIN_COLOR, fontWeight: 800, fontSize: '0.875rem' }}>
                            {totalGrossGains.toFixed(2)}
                        </TableCell>
                        <TableCell align="center" sx={{ color: LOSS_COLOR, fontWeight: 800, fontSize: '0.875rem' }}>
                            {totalGrossLosses === 0 ? '0.00' : totalGrossLosses.toFixed(2)}
                        </TableCell>
                        <TableCell align="center" sx={{ color: totalNet >= 0 ? GAIN_COLOR : LOSS_COLOR, fontWeight: 800, fontSize: '0.875rem' }}>
                            {totalNet.toFixed(2)}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.875rem', color: result.netGain >= 0 ? GAIN_COLOR : LOSS_COLOR }}>
                            {result.netGain >= 0 ? '+' : '-'}100%
                        </TableCell>
                        <TableCell />
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
    );
}

function ResultTable({ result }: { result: SilverBulletResult }) {
    const colLabel = `Volume to ${result.focusBrandFull}`;
    const netLabel = `Net Gain of ${result.focusBrandFull}`;
    const netColor = result.netGain >= 0 ? GAIN_COLOR : LOSS_COLOR;

    return (
        <TableContainer component={Paper} elevation={2} sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ backgroundColor: HEADER_BG }}>
                        {['respondent_id', 'source_brand', colLabel, 'allocation_type'].map(h => (
                            <TableCell
                                key={h}
                                align="center"
                                sx={{ color: HEADER_TEXT, fontWeight: 700, fontSize: '0.8rem', letterSpacing: 0.3, borderBottom: 'none', py: 1.5 }}
                            >
                                {h}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {result.entries.map((entry: GainLossEntry, idx: number) => {
                        const isGain = entry.volume >= 0;
                        const color = isGain ? GAIN_COLOR : LOSS_COLOR;
                        const rowBg = isGain ? 'transparent' : '#fff8f8';
                        return (
                            <TableRow
                                key={idx}
                                sx={{
                                    backgroundColor: rowBg,
                                    '&:hover': { backgroundColor: isGain ? '#f0faf0' : '#fde8e8' },
                                }}
                            >
                                <TableCell align="center" sx={{ color, fontWeight: 500 }}>
                                    {entry.respondent_id}
                                </TableCell>
                                <TableCell align="center" sx={{ color, fontWeight: 500 }}>
                                    {entry.source_brand}
                                </TableCell>
                                <TableCell align="center" sx={{ color, fontWeight: 600 }}>
                                    {entry.volume.toFixed(2)}
                                </TableCell>
                                <TableCell align="center" sx={{ color, fontWeight: 500 }}>
                                    {entry.allocation_type}
                                </TableCell>
                            </TableRow>
                        );
                    })}

                    {/* Net Gain footer */}
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell colSpan={2} align="right" sx={{ fontWeight: 700, fontSize: '0.875rem', py: 1.5 }}>
                            {netLabel}
                        </TableCell>
                        <TableCell align="center" sx={{ color: netColor, fontWeight: 800, fontSize: '1rem' }}>
                            ~{result.netGain.toFixed(0)} ml
                        </TableCell>
                        <TableCell />
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
    );
}

const SilverBulletDashBoard = () => {
    const [ metadata, setMetadata ] = useState<SilverBulletMetadata>();
    const [ focusBrand, setFocusBrand ] = useState<string>('');
    const [ focusPackType, setFocusPackType ] = useState<string>('All');
    const [ focusPackSize, setFocusPackSize ] = useState<string>('All');
    const [ comparisonLevel, setComparisonLevel ] = useState<ComparisonLevel>('brand+type+size');
    const [ selectedProjects, setSelectedProjects ] = useState<string[]>([]);
    const [result, setResult] = useState<SilverBulletResult | null>(null);
    const [isStale, setIsStale] = useState(false);

    const brandEntries = metadata?.brands.filter(b => b.brand_name === focusBrand) ?? [];
    const availablePackTypes = [...new Set(brandEntries.map(b => b.pack_type))];
    const availablePackSizes = [...new Set(
        brandEntries
            .filter(b => focusPackType === "All" || b.pack_type === focusPackType)
            .map(b => b.pack_size)
    )];

    const handleBrandChange = (brand: string) => {
        setFocusBrand(brand);
        setFocusPackType('All');
        setFocusPackSize('All');
    };

    const handlePackTypeChange = (packType: string) => {
        setFocusPackType(packType);
        setFocusPackSize('All');
    };

    const [p1From, setP1From] = useState<Dayjs>(dayjs());
    const [p1To,   setP1To  ] = useState<Dayjs>(dayjs());
    const [p2From, setP2From] = useState<Dayjs>(dayjs());
    const [p2To,   setP2To  ] = useState<Dayjs>(dayjs());

    useEffect(() => {
        if (result) setIsStale(true);
    }, [focusBrand, focusPackType, focusPackSize, comparisonLevel, selectedProjects, p1From, p1To, p2From, p2To]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await axios.get(ApiConfig.silverBulletDashboard.getMetadata, {
                    params: {
                        project_names: selectedProjects.length > 0 ? selectedProjects : undefined,
                    },
                });
                const data: SilverBulletMetadata = response.data.data;
                setMetadata(data);

                const min = dayjs(data.min_recorded_date as unknown as string);
                const max = dayjs(data.max_recorded_date as unknown as string);

                setP1From(min);
                setP1To(max);
                setP2From(min);
                setP2To(max);

                const availableBrandNames = new Set(data.brands.map(b => b.brand_name));
                if (focusBrand && !availableBrandNames.has(focusBrand)) {
                    setFocusBrand('');
                    setFocusPackType('All');
                    setFocusPackSize('All');
                }
            } catch (error) {
                console.error('Error fetching silver bullet metadata:', error);
            }
        };

        fetchMetadata();
    }, [selectedProjects]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCalculate = async () => {
        if (!focusBrand) return;

        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get(ApiConfig.silverBulletDashboard.getRespondents, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    // pack_type: focusPackType,
                    // pack_size: focusPackSize,
                    p1_from: p1From.format('YYYY-MM-DD'),
                    p1_to:   p1To.format('YYYY-MM-DD'),
                    p2_from: p2From.format('YYYY-MM-DD'),
                    p2_to:   p2To.format('YYYY-MM-DD'),
                    project_names: selectedProjects.length > 0 ? selectedProjects : undefined,
                },
            });

            const p1: RawDataPoint[] = response.data.data.p1 ?? [];
            const p2: RawDataPoint[] = response.data.data.p2 ?? [];
            
            const res = calculateSilverBullet(p1, p2, focusBrand, focusPackType, focusPackSize, comparisonLevel);
            setResult(res);
            setIsStale(false);
        } catch (error) {
            console.error('Error fetching silver bullet respondents', error);
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
            <Typography variant="h5" fontWeight={700} mb={3}>
                Silver Bullet Dashboard
            </Typography>

            {/* Filter panel */}
            <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" fontWeight={600} color="text.secondary" minWidth={100}>
                            Comparison Level
                        </Typography>
                        <RadioGroup
                            row
                            value={comparisonLevel}
                            onChange={e => setComparisonLevel(e.target.value as ComparisonLevel)}
                        >
                            {(Object.keys(COMPARISON_LEVEL_LABELS) as ComparisonLevel[]).map(level => (
                                <FormControlLabel
                                    key={level}
                                    value={level}
                                    control={<Radio size="small" />}
                                    label={<Typography variant="body2">{COMPARISON_LEVEL_LABELS[level]}</Typography>}
                                />
                            ))}
                        </RadioGroup>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" fontWeight={600} color="text.secondary" minWidth={100}>
                            Project
                        </Typography>
                        <Autocomplete
                            multiple
                            size="small"
                            disableCloseOnSelect
                            options={metadata?.project_names ?? []}
                            value={selectedProjects}
                            onChange={(_, values) => setSelectedProjects(values)}
                            renderOption={(props, option, { selected }) => (
                                <li {...props}>
                                    <Checkbox
                                        icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                                        checkedIcon={<CheckBoxIcon fontSize="small" />}
                                        checked={selected}
                                        sx={{ mr: 1, p: 0.5 }}
                                    />
                                    {option}
                                </li>
                            )}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip size="small" label={option} {...getTagProps({ index })} />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField {...params} placeholder={selectedProjects.length === 0 ? 'All projects' : ''} />
                            )}
                            sx={{ minWidth: 320, flex: 1 }}
                        />
                    </Box>

                    <PeriodPicker
                        label="Period 1"
                        from={p1From}
                        to={p1To}
                        onFromChange={v => v && setP1From(v)}
                        onToChange={v => v && setP1To(v)}
                        minFrom={dayjs(metadata?.min_recorded_date)}
                        maxFrom={dayjs(metadata?.max_recorded_date)}
                        minTo={dayjs(metadata?.min_recorded_date)}
                        maxTo={dayjs(metadata?.max_recorded_date)}
                    />
                    <PeriodPicker
                        label="Period 2"
                        from={p2From}
                        to={p2To}
                        onFromChange={v => v && setP2From(v)}
                        onToChange={v => v && setP2To(v)}
                        minFrom={dayjs(metadata?.min_recorded_date)}
                        maxFrom={dayjs(metadata?.max_recorded_date)}
                        minTo={dayjs(metadata?.min_recorded_date)}
                        maxTo={dayjs(metadata?.max_recorded_date)}
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Focus Brand</InputLabel>
                            <Select
                                value={focusBrand}
                                label="Focus Brand"
                                onChange={e => handleBrandChange(e.target.value)}
                            >
                                {[...new Set(metadata?.brands.map(b => b.brand_name))].map(name => (
                                    <MenuItem key={name} value={name}>{name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 200 }} disabled={!focusBrand}>
                            <InputLabel>Pack Type</InputLabel>
                            <Select
                                value={focusPackType}
                                label="Pack Type"
                                onChange={e => handlePackTypeChange(e.target.value)}
                            >
                                <MenuItem key={"All"} value={"All"}>{"All"}</MenuItem>
                                {availablePackTypes.map(pt => (
                                    <MenuItem key={pt} value={pt}>{pt}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 200 }} disabled={!focusBrand}>
                            <InputLabel>Pack Size</InputLabel>
                            <Select
                                value={focusPackSize}
                                label="Pack Size"
                                onChange={e => setFocusPackSize(e.target.value)}
                            >
                                <MenuItem key={"All"} value={"All"}>{"All"}</MenuItem>
                                {availablePackSizes.map(ps => (
                                    <MenuItem key={ps} value={ps}>{ps}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Button
                            variant="contained"
                            disabled={!focusBrand}
                            onClick={handleCalculate}
                            sx={{ textTransform: 'none', px: 3, height: 40, backgroundColor: HEADER_BG, '&:hover': { backgroundColor: '#002080' } }}
                        >
                            Calculate
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Results */}
            {result && (
                result.entries.length === 0 ? (
                    <Typography mt={3} color="text.secondary">
                        No data found for <strong>{focusBrand}</strong> in the selected periods.
                    </Typography>
                ) : (
                    <Box sx={{ position: 'relative' }}>
                        <Box sx={{ opacity: isStale ? 0.35 : 1, transition: 'opacity 0.2s', pointerEvents: isStale ? 'none' : 'auto' }}>
                            <SummaryTable result={result} />
                            <ResultTable result={result} />
                        </Box>
                        {isStale && (
                            <Box sx={{
                                position: 'absolute', inset: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Box sx={{
                                    backgroundColor: 'rgba(255,255,255,0.92)',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 2,
                                    px: 3, py: 1.5,
                                    boxShadow: 1,
                                }}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                        Filters changed — click <strong>Calculate</strong> to update results
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>
                )
            )}
        </Box>
    );
};

export default SilverBulletDashBoard;
