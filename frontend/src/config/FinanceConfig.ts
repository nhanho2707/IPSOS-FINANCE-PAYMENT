// Below these balances (VND) the provider card on the Finance page warns "Low balance".
// Set them to roughly a week of gifts so there is time to top up before sending stops.
export const LOW_BALANCE_THRESHOLDS: Record<"vinnet" | "gotit", number> = {
    vinnet: 100_000_000,
    gotit: 50_000_000,
};

export interface GotItDeposit {
    id: number;
    amount: number;
    note: string | null;
    // Null for deposits added before the author was recorded.
    created_by: string | null;
    created_by_email: string | null;
    created_at: string;
    // Set when the deposit was voided (entered by mistake); it then no longer counts toward the balance.
    voided_at: string | null;
    voided_by: string | null;
    void_reason: string | null;
}

export type DepositVoidResult = "voided" | "alreadyVoided" | "failed";

// The runway estimate on the provider cards uses the spending of this many recent days.
export const RECENT_SPEND_DAYS = 30;
