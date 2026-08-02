import dayjs, { Dayjs } from "dayjs";

export interface SilverBulletMetadata {
    brands: { brand_code: string; brand_name: string, pack_type: string, pack_size: string }[];
    pack_types: string[],
    pack_sizes: string[],
    project_names: string[],
    min_recorded_date: Dayjs;
    max_recorded_date: Dayjs;
}

export interface RawDataPoint {
    id: number;
    respondent_id: number;
    brand_code: number;
    brand_name: string;
    pack_type: string;
    pack_size: string;
    quantity: number;
    recorded_date: string; // YYYY-MM-DD
    time_of_day: string;
    project_name: string;
}

export interface RawDataPointByPack {
    id: number;
    respondent_id: number;
    brand_name: string;
    quantity: number;
    recorded_date: string;
    time_of_day: string;
}

export interface GainLossEntry {
    respondent_id: number;
    source_brand: string;
    volume: number;
    allocation_type: 'Brand Switch' | 'Category Growth';
}

export interface SilverBulletResult {
    focusBrandFull: string;
    entries: GainLossEntry[];
    netGain: number;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

export function getUniqueBrands(data: RawDataPoint[]): string[] {
    return [...new Set(data.map(d => d.brand_name))].sort();
}

export function getDateRange(data: RawDataPoint[]): { minDate: string; maxDate: string } | null {
    if (data.length === 0) return null;
    const dates = data.map(d => d.recorded_date).sort();
    return { minDate: dates[0], maxDate: dates[dates.length - 1] };
} 

// Parses pack size strings like "330ml", "1.5L", "1,5L" → ml value.
// Returns 1 for unrecognised formats (e.g. "20s") so quantity is unchanged.
export function parsePackSizeVolume(packSize: string): number {
    const s = packSize.trim().replace(',', '.');
    const mlMatch = s.match(/^([\d.]+)\s*ml$/i);
    if (mlMatch) return parseFloat(mlMatch[1]);
    const lMatch = s.match(/^([\d.]+)\s*l$/i);
    if (lMatch) return parseFloat(lMatch[1]) * 1000;
    return 1;
}

export type ComparisonLevel = 'brand' | 'brand+type' | 'brand+type+size' | 'brand+size';

export const COMPARISON_LEVEL_LABELS: Record<ComparisonLevel, string> = {
    'brand+type+size': 'Brand · Type · Size',
    'brand+type':      'Brand · Type',
    'brand+size':      'Brand · Size',
    'brand':           'Brand',
};

export function convertToRawDataPoint(
    data: RawDataPoint[],
    focusBrand: string,
    focusPackType: string,
    focusPackSize: string,
    comparisonLevel: ComparisonLevel
): RawDataPointByPack[] {
    const grouped: Record<string, RawDataPointByPack> = {};

    for (const d of data) {
        let brand_name: string;

        const includesType = comparisonLevel === 'brand+type' || comparisonLevel === 'brand+type+size';
        const includesSize = comparisonLevel === 'brand+size' || comparisonLevel === 'brand+type+size';

        if (d.brand_name === focusBrand) {
            brand_name = d.brand_name;
            if (includesType && focusPackType !== 'All') {
                brand_name += ' - ' + d.pack_type;
            }
            if (includesSize && focusPackSize !== 'All') {
                brand_name += ' - ' + d.pack_size;
            }
        } else {
            brand_name = d.brand_name;
            if (includesType) {
                brand_name += ' - ' + d.pack_type;
            }
            if (includesSize) {
                brand_name += ' - ' + d.pack_size;
            }
        }

        const key = [d.respondent_id, brand_name, d.recorded_date, d.time_of_day].join('|');
        const volume = round2(Number(d.quantity) * parsePackSizeVolume(d.pack_size));

        if (grouped[key]) {
            grouped[key].quantity = round2(grouped[key].quantity + volume);
        } else {
            grouped[key] = {
                id: d.id,
                respondent_id: d.respondent_id,
                brand_name,
                quantity: volume,
                recorded_date: d.recorded_date,
                time_of_day: d.time_of_day,
            };
        }
    }

    return Object.values(grouped);
}

// Returns: respondent_id → { brand_name → net consumption change }
// Multi-date respondents: sum of sequential diffs qty[i] - qty[i-1]
// Single-date respondents: quantity of that date
function calculateChangeInConsumption(
    data: RawDataPointByPack[]
): Record<number, Record<string, number>> {
    const result: Record<number, Record<string, number>> = {};
    const respondentIds = [...new Set(data.map(d => d.respondent_id))];

    for (const rid of respondentIds) {
        if(rid === 2272599){
            const a = "Test";
        }
        const byBrand: Record<string, number> = {};
        const respRows = data.filter(d => d.respondent_id === rid);
        const brands = [...new Set(respRows.map(d => d.brand_name))];

        for (const brand of brands) {
            const rows = respRows
                .filter(d => d.brand_name === brand)
                .sort((a, b) => a.recorded_date.localeCompare(b.recorded_date));

            let netChange = 0;
            for (let i = 0; i < rows.length; i++) {
                netChange += Number(rows[i].quantity);
            }
            byBrand[brand] = round2(netChange);

            // if (rows.length === 1) {
            //     byBrand[brand] = Number(rows[0].quantity);
            // } else {
            //     let netChange = 0;
            //     for (let i = 0; i < rows.length; i++) {
            //         netChange += Number(rows[i].quantity) + Number(rows[i - 1].quantity);
            //     }
            //     byBrand[brand] = round2(netChange);
            // }
        }

        result[rid] = byBrand;
    }

    return result;
}

export function calculateSilverBullet(
    p1Data: RawDataPoint[],
    p2Data: RawDataPoint[],
    focusBrand: string,
    focusPackType: string,
    focusPackSize: string,
    comparisonLevel: ComparisonLevel = 'brand+type+size'
): SilverBulletResult {
    const p1BrandData = convertToRawDataPoint(p1Data, focusBrand, focusPackType, focusPackSize, comparisonLevel);
    const p2BrandData = convertToRawDataPoint(p2Data, focusBrand, focusPackType, focusPackSize, comparisonLevel);

    const p1Map = calculateChangeInConsumption(p1BrandData);
    const p2Map = calculateChangeInConsumption(p2BrandData);

    let focusBrandFull = focusBrand;

    if ((comparisonLevel === 'brand+type' || comparisonLevel === 'brand+type+size') && focusPackType !== 'All') {
        focusBrandFull += ' - ' + focusPackType;
    }
    if ((comparisonLevel === 'brand+size' || comparisonLevel === 'brand+type+size') && focusPackSize !== 'All') {
        focusBrandFull += ' - ' + focusPackSize;
    }

    const respondentIds = [
        ...new Set([
            ...Object.keys(p1Map),
            ...Object.keys(p2Map),
        ])
    ].sort((a, b) => Number(a) - Number(b));

    const entries: GainLossEntry[] = [];

    for (const rid of respondentIds) {
        if(rid === '2272599')
        {
            const a = "Test";
        }
        const p1 = p1Map[Number(rid)] ?? {};
        const p2 = p2Map[Number(rid)] ?? {};

        //if (Object.keys(p1).length === 0 || Object.keys(p2).length === 0) continue;

        const allBrands = [...new Set([...Object.keys(p1), ...Object.keys(p2)])];

        const changes: Record<string, number> = {};

        for (const brand of allBrands) {
            changes[brand] = (p2[brand] || 0) - (p1[brand] || 0);
        }

        const focusChange = changes[focusBrandFull] || 0;
        if (focusChange === 0) continue;

        const p1Category = Object.values(p1).reduce((s, c) => s + c, 0);
        const p2Category = Object.values(p2).reduce((s, c) => s + c, 0);

        const categoryChange = p2Category - p1Category;

        // if (categoryChange == 0) continue;

        const brandChanges: Record<string, number> = {};
        
        for (const [brand, change] of Object.entries(changes)) {
            if(brand != focusBrandFull){

                if(focusChange > 0){
                    if(change < 0) brandChanges[brand] = change;
                } else {
                    if(change > 0) brandChanges[brand] = change;
                }
            }
        }

        let totalUnits = Object.values(brandChanges).reduce((s, v) => s + Math.abs(v), 0);

        if((changes[focusBrandFull] > 0 && categoryChange > 0) || (changes[focusBrandFull] < 0 && categoryChange < 0)){
            totalUnits += Math.abs(categoryChange)
        }

        for (const [brand, change] of Object.entries(brandChanges)) {
            entries.push({
                respondent_id: Number(rid),
                source_brand: brand,
                volume: round2(focusChange * (Math.abs(change) / totalUnits)),
                allocation_type: 'Brand Switch',
            });
        }
        if(changes[focusBrandFull] > 0 && categoryChange > 0){
            entries.push({
                respondent_id: Number(rid),
                source_brand: 'Category Expansion',
                volume: round2(focusChange * (Math.abs(categoryChange) / totalUnits)),
                allocation_type: 'Category Growth',
            });
        }
        if(changes[focusBrandFull] < 0 && categoryChange < 0){
            entries.push({
                respondent_id: Number(rid),
                source_brand: 'Category Contraction',
                volume: round2(focusChange * (Math.abs(categoryChange) / totalUnits)),
                allocation_type: 'Category Growth',
            });
        } 
    }

    const netGain = round2(entries.reduce((s, e) => s + e.volume, 0));
    return { focusBrandFull, entries, netGain };
}

export interface SummaryRow {
    source: string;
    grossGains: number;
    grossLosses: number;
    netContribution: number;
    percentOfNet: number;
}

export function computeSummaryRows(result: SilverBulletResult): SummaryRow[] {
    const grouped: Record<string, { gains: number; losses: number }> = {};

    for (const entry of result.entries) {
        const key = entry.allocation_type === 'Category Growth' ? 'Category' : entry.source_brand;

        if (!grouped[key]) grouped[key] = { gains: 0, losses: 0 };

        if (entry.volume >= 0) {
            grouped[key].gains = round2(grouped[key].gains + entry.volume);
        } else {
            grouped[key].losses = round2(grouped[key].losses + entry.volume);
        }
    }

    return Object.entries(grouped)
        .map(([source, { gains, losses }]) => {
            const netContribution = round2(gains + losses);
            return {
                source,
                grossGains: round2(gains),
                grossLosses: round2(losses),
                netContribution,
                percentOfNet: result.netGain !== 0 ? round2((netContribution / Math.abs(result.netGain)) * 100) : 0,
            };
        })
        .sort((a, b) => b.netContribution - a.netContribution);
}