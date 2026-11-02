// Below these balances (VND) the provider card on the Finance page warns "Low balance".
// Set them to roughly a week of gifts so there is time to top up before sending stops.
export const LOW_BALANCE_THRESHOLDS: Record<"vinnet" | "gotit", number> = {
    vinnet: 100_000_000,
    gotit: 50_000_000,
};

// The runway estimate on the provider cards uses the spending of this many recent days.
export const RECENT_SPEND_DAYS = 30;
