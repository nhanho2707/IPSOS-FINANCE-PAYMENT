// TODO: replace with the real option lists once available.
export const cityOptions: string[] = [];
export const userOptions: string[] = [];
export const needstateOptions: string[] = [];
export const weightOptions: string[] = [];

export interface NPSData {
    score: number;
    promoters: number;
    passives: number;
    detractors: number;
}

export interface RankedFactor {
    rank: number;
    label: string;
    value: number;
}

export interface YearComparisonBucket {
    label: string;
    y2025: number;
    y2026: number;
}

export interface ProductComparisonItem {
    label: string;
    y2025: number;
    y2026: number;
}

export const npsData: NPSData = {
    score: 73.6,
    promoters: 80.6,
    passives: 12.4,
    detractors: 7.0
};

export const rankedFactors: RankedFactor[] = [
    { rank: 1, label: "Product experience", value: 88 },
    { rank: 2, label: "Store Design", value: 87 },
    { rank: 3, label: "Store ambience", value: 89 },
    { rank: 4, label: "Staff friendliness", value: 93 },
    { rank: 5, label: "Store condition & facilities", value: 89 },
    { rank: 6, label: "Store cleanliness", value: 91 },
    { rank: 7, label: "Time & Process", value: 93 }
];

export const spendAverage = { y2025: "10.6M", y2026: "12.9M" };

// Labels omit the repeated "VND" unit - shown once via the chart's subheader instead.
export const spendDistribution: YearComparisonBucket[] = [
    { label: "Under 4.5m", y2025: 12, y2026: 8 },
    { label: "4.5m - 8.99m", y2025: 24, y2026: 16 },
    { label: "9.0m - 11.99m", y2025: 19, y2026: 13 },
    { label: "12.0m - 14.99m", y2025: 13, y2026: 9 },
    { label: "15.0m - 24.99m", y2025: 17, y2026: 21 },
    { label: "25.0m or higher", y2025: 15, y2026: 33 }
];

export const productSampleSize = { y2025: 10368, y2026: 9375 };

export const productsConsumed: ProductComparisonItem[] = [
    { label: "Coffee", y2025: 57, y2026: 60 },
    { label: "Traditional coffee", y2025: 43, y2026: 46 },
    { label: "PhinDi", y2025: 12, y2026: 11 },
    { label: "Espresso based coffee", y2025: 3, y2026: 1 },
    { label: "Tea", y2025: 35, y2026: 32 },
    { label: "Freeze", y2025: 8, y2026: 7 },
    { label: "Banh mi", y2025: 2, y2026: 1 },
    { label: "Cake", y2025: 5, y2026: 4 },
    { label: "Croissant/ savory pastry", y2025: 3, y2026: 2 }
];
