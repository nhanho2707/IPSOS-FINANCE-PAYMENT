export function formatClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, "-");
}

export function toProperCase(str: string){
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

const amountFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

// Every amount in this app is VND (Vinnet top-ups, GotIt vouchers, province prices).
// Laravel returns decimal columns as strings, so numeric strings are accepted too.
export function formatMoney(value: number | string | null | undefined): string {
    const amount = Number(value);
    if (value === null || value === undefined || value === "" || !Number.isFinite(amount)) return "—";
    return `${amountFormat.format(amount)} ₫`;
}
