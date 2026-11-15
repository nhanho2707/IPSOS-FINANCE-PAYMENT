// Interviews for the statistics pages, with the same aggregation as TransactionStatisticsService,
// so filters picked in a chart really change the other charts during a test.
type Channel = "vinnet" | "gotit" | "other";

interface Interview {
    id: number;
    project_id: number;
    project_code: string;
    project_name: string;
    respondent_id: string;
    phone: string;
    channel: Channel;
    employee_id: string;
    employee_name: string;
    interview_start: string;
    interview_end: string | null;
    gift_time: string | null;
    amount: number;
    gifted: boolean;
    gift_status: string;
    offline: boolean;
    wait_minutes: number | null;
    wait_bucket: string | null;
    needs_review: boolean;
    day: string;
    weekday: number | null;
    hour: number | null;
    gift_hour: number | null;
}

const CHANNELS: Channel[] = ["vinnet", "gotit", "other"];
const WAIT_BUCKETS: [string, number][] = [["early", -6], ["le15", 15], ["le60", 60], ["le360", 360], ["le1440", 1440], ["gt1440", Infinity]];
const TOLERANCE = 5;

const PROJECTS: [number, string, string, number][] = [
    [1, "VN2604", "Vinamilk Brand Health Tracking Q4", 0.3],
    [3, "VN2587", "Techcombank Customer Experience Panel Wave 7", 0.26],
    [6, "VN2555", "Grab Food Delivery NPS Tracker", 0.3],
    [10, "VN2528", "Nestlé Milo Kids Snacking Diary", 0.14],
];

const INTERVIEWERS: [string, string][] = [
    ["HN001", "Nguyễn Văn An"], ["HN002", "Trần Thị Bình"], ["HN003", "Lê Minh Châu"], ["HN007", "Phạm Văn Dũng"],
    ["HN012", "Võ Thu Giang"], ["SG001", "Đặng Thị Hà"], ["SG004", "Bùi Đăng Khoa"], ["SG009", "Hoàng Mỹ Linh"],
    ["SG015", "Đỗ Quang Minh"], ["DN002", "Ngô Bảo Ngọc"], ["DN006", "Dương Thanh Phong"], ["CT003", "Lý Thu Quỳnh"],
];

// Deterministic, so every run and every screenshot sees the same interviews.
const random = (() => {
    let state = 20261102;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
})();

const pick = <T,>(items: T[], weights: number[]): T => {
    let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
    const index = weights.findIndex((weight) => (roll -= weight) < 0);
    return items[index < 0 ? items.length - 1 : index];
};

const pad = (value: number) => String(value).padStart(2, "0");

// Wall-clock times are kept in UTC fields so the arithmetic never depends on the machine's timezone.
const stamp = (date: Date) =>
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:00`;

const bucketOf = (minutes: number) => WAIT_BUCKETS.find(([, upTo]) => minutes <= upTo)?.[0] ?? "gt1440";

const waitFor = (employee: string): number => {
    // One interviewer sends gifts early far more often than the rest: the pattern the page is meant to expose.
    const early = employee === "HN007" ? 0.22 : 0.012;
    const kind = pick(["early", "le15", "le60", "le360", "le1440", "gt1440"], [early, 0.56, 0.25, 0.1, 0.05, 0.02]);
    const between = (min: number, max: number) => Math.round(min + random() * (max - min));

    return {
        early: -between(6, 45), le15: between(1, 15), le60: between(16, 60), le360: between(61, 360), le1440: between(361, 1440), gt1440: between(1441, 4000),
    }[kind] as number;
};

const build = (): Interview[] => {
    const interviews: Interview[] = [];
    const lastDay = Date.UTC(2026, 10, 1);
    let id = 1;

    for (let offset = 89; offset >= 0; offset--) {
        const dayStart = lastDay - offset * 86400000;
        const weekday = ((new Date(dayStart).getUTCDay() + 6) % 7) + 1;
        const base = weekday >= 6 ? 7 : 19;
        const count = Math.round(base * (0.75 + random() * 0.5) * (1 + (89 - offset) / 260));

        for (let i = 0; i < count; i++) {
            const [projectId, projectCode, projectName] = pick(PROJECTS, PROJECTS.map((project) => project[3]));
            const [employeeId, employeeName] = pick(INTERVIEWERS, [9, 8, 8, 6, 5, 9, 7, 6, 4, 5, 4, 3]);
            const channel = pick(CHANNELS, [0.62, 0.35, 0.03]);
            const hourFloat = Math.min(20.5, Math.max(7.2, 14 + (random() + random() + random() - 1.5) * 5.2));
            const start = new Date(dayStart + Math.round(hourFloat * 60) * 60000);
            const offline = random() < 0.02;
            const noEnd = !offline && random() < 0.015;
            const end = offline ? start : noEnd ? null : new Date(start.getTime() + (20 + Math.round(random() * 25)) * 60000);
            const outcome = pick(["success", "pending", "refused", "failed"], [0.93, 0.03, 0.02, 0.02]);
            const gifted = outcome === "success";
            const wait = gifted && end && !offline ? waitFor(employeeId) : null;
            const gift = !gifted ? null
                : wait !== null && end ? new Date(end.getTime() + wait * 60000)
                : new Date(start.getTime() + (offline ? 26 * 60 : 40) * 60000);

            interviews.push({
                id,
                project_id: projectId,
                project_code: projectCode,
                project_name: projectName,
                respondent_id: `INS-${48000 + id}`,
                phone: `09${String(10000000 + ((id * 7919) % 89999999)).slice(0, 8)}`,
                channel,
                employee_id: employeeId,
                employee_name: employeeName,
                interview_start: stamp(start),
                interview_end: end ? stamp(end) : null,
                gift_time: gift ? stamp(gift) : null,
                amount: gifted ? pick([50000, 100000, 200000], [0.55, 0.35, 0.1]) : 0,
                gifted,
                gift_status: outcome,
                offline,
                wait_minutes: wait,
                wait_bucket: wait === null ? null : bucketOf(wait),
                needs_review: wait !== null && wait < -TOLERANCE,
                day: stamp(start).slice(0, 10),
                weekday: offline ? null : weekday,
                hour: offline ? null : start.getUTCHours(),
                gift_hour: gift ? gift.getUTCHours() : null,
            });
            id++;
        }
    }

    return interviews;
};

const INTERVIEWS = build();

const median = (values: number[]): number | null => {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

const scoped = (projectId: number, query: URLSearchParams, range?: { from: string; to: string }) => {
    const channel = query.get("channel");
    const from = range?.from ?? query.get("date_from");
    const to = range?.to ?? query.get("date_to");

    return INTERVIEWS.filter((row) =>
        (projectId === 0 || row.project_id === projectId)
        && (!channel || row.channel === channel)
        && (!from || row.day >= from)
        && (!to || row.day <= to));
};

const passesEmployee = (row: Interview, query: URLSearchParams) => !query.get("employee") || row.employee_id === query.get("employee");
const passesWait = (row: Interview, query: URLSearchParams) => !query.get("wait") || row.wait_bucket === query.get("wait");
const passesSlot = (row: Interview, query: URLSearchParams) =>
    (!query.get("weekday") || row.weekday === Number(query.get("weekday")))
    && (!query.get("hour") || row.hour === Number(query.get("hour")));
const passes = (row: Interview, query: URLSearchParams) => passesEmployee(row, query) && passesWait(row, query) && passesSlot(row, query);

interface Group {
    interviews: number;
    gifts: number;
    amount: number;
    review: number;
    waits: number[];
}

const addToGroup = <T extends object>(groups: Map<string, T & Group>, key: string, row: Interview, identity: T) => {
    const group = groups.get(key) ?? { ...identity, interviews: 0, gifts: 0, amount: 0, review: 0, waits: [] };
    groups.set(key, group);
    group.interviews++;

    if (!row.gifted) return;

    group.gifts++;
    group.amount += row.amount;
    if (row.wait_minutes !== null) group.waits.push(row.wait_minutes);
    if (row.needs_review) group.review++;
};

const finishGroups = <T extends Group>(groups: Map<string, T>) =>
    Array.from(groups.values())
        .map(({ waits, ...group }) => ({ ...group, median_wait_minutes: median(waits) }))
        .sort((a, b) => b.interviews - a.interviews);

const zeroChannels = () => ({ vinnet: 0, gotit: 0, other: 0 });

const aggregate = (projectId: number, query: URLSearchParams, range?: { from: string; to: string }) => {
    const byChannel = { vinnet: { interviews: 0, gifts: 0, amount: 0 }, gotit: { interviews: 0, gifts: 0, amount: 0 }, other: { interviews: 0, gifts: 0, amount: 0 } };
    const waitBuckets = new Map(WAIT_BUCKETS.map(([key]) => [key, 0]));
    const interviewHours = Array(24).fill(0);
    const giftHours = Array(24).fill(0);
    const weekdayHours = Array.from({ length: 7 }, () => Array(24).fill(0));
    const daily = new Map<string, { date: string; interviews: Record<Channel, number>; gifts: Record<Channel, number>; amount: Record<Channel, number> }>();
    const byEmployee = new Map<string, { employee_id: string; employee_name: string } & Group>();
    const byProject = new Map<string, { project_id: number; internal_code: string; project_name: string } & Group>();
    const waits: number[] = [];
    let interviews = 0, gifts = 0, amount = 0, reviewTotal = 0, unknown = 0, offline = 0;

    scoped(projectId, query, range).forEach((row) => {
        const employeeOk = passesEmployee(row, query);
        const waitOk = passesWait(row, query);
        const slotOk = passesSlot(row, query);

        if (waitOk && slotOk) addToGroup(byEmployee, row.employee_id, row, { employee_id: row.employee_id, employee_name: row.employee_name });
        if (employeeOk && slotOk && row.wait_bucket) waitBuckets.set(row.wait_bucket, (waitBuckets.get(row.wait_bucket) ?? 0) + 1);

        if (employeeOk && waitOk) {
            if (row.hour !== null && row.weekday !== null) {
                interviewHours[row.hour]++;
                weekdayHours[row.weekday - 1][row.hour]++;
            }
            if (row.gift_hour !== null) giftHours[row.gift_hour]++;
        }

        if (!(employeeOk && waitOk && slotOk)) return;

        interviews++;
        byChannel[row.channel].interviews++;
        if (projectId === 0) addToGroup(byProject, String(row.project_id), row, { project_id: row.project_id, internal_code: row.project_code, project_name: row.project_name });

        const day = daily.get(row.day) ?? { date: row.day, interviews: zeroChannels(), gifts: zeroChannels(), amount: zeroChannels() };
        daily.set(row.day, day);
        day.interviews[row.channel]++;

        if (!row.gifted) return;

        gifts++;
        amount += row.amount;
        byChannel[row.channel].gifts++;
        byChannel[row.channel].amount += row.amount;
        day.gifts[row.channel]++;
        day.amount[row.channel] += row.amount;

        if (row.offline) offline++;
        else if (row.wait_minutes === null) unknown++;
        else waits.push(row.wait_minutes);

        if (row.needs_review) reviewTotal++;
    });

    return {
        interviews,
        gifts,
        amount,
        by_channel: byChannel,
        review_total: reviewTotal,
        wait: {
            median_minutes: median(waits),
            measured: waits.length,
            unknown,
            offline,
            tolerance_minutes: TOLERANCE,
            buckets: Array.from(waitBuckets, ([key, count]) => ({ key, count })),
        },
        interview_hours: interviewHours,
        gift_hours: giftHours,
        weekday_hours: weekdayHours,
        daily: Array.from(daily.values()).sort((a, b) => a.date.localeCompare(b.date)),
        by_employee: finishGroups(byEmployee),
        by_project: finishGroups(byProject),
    };
};

const shiftDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

export function statisticsSummary(projectId: number, query: URLSearchParams) {
    const summary = aggregate(projectId, query);
    const from = query.get("date_from");
    const to = query.get("date_to");
    let previous = null;

    if (from && to) {
        const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
        const range = { from: shiftDays(from, -days), to: shiftDays(from, -1) };
        const before = aggregate(projectId, query, range);

        previous = {
            date_from: range.from,
            date_to: range.to,
            interviews: before.interviews,
            gifts: before.gifts,
            amount: before.amount,
            median_wait_minutes: before.wait.median_minutes,
            review_total: before.review_total,
        };
    }

    return { status_code: 200, message: "Successful request.", data: { ...summary, previous } };
}

const inView = (row: Interview, view: string) => (view === "review" ? row.needs_review : view === "no_gift" ? !row.gifted : true);

export function statisticsInterviews(projectId: number, query: URLSearchParams) {
    const view = query.get("view") ?? "review";
    const sort = (query.get("sort") ?? (view === "review" ? "wait_minutes" : "interview_start")) as keyof Interview;
    const descending = (query.get("direction") ?? (view === "review" ? "asc" : "desc")) === "desc";
    const perPage = Number(query.get("per_page") ?? 10);
    const page = Number(query.get("page") ?? 1);
    const term = (query.get("search") ?? "").toLowerCase();

    const matching = scoped(projectId, query).filter((row) =>
        passes(row, query)
        && (!term || [row.respondent_id, row.phone, row.employee_id, row.employee_name].some((value) => value.toLowerCase().includes(term))));

    const ranked = matching.filter((row) => inView(row, view)).sort((a, b) => {
        const left = a[sort];
        const right = b[sort];

        if (left === null || right === null) return Number(left === null) - Number(right === null) || a.id - b.id;

        const order = left < right ? -1 : left > right ? 1 : 0;
        return (descending ? -order : order) || a.id - b.id;
    });

    return {
        status_code: 200,
        message: "Successful request.",
        data: ranked.slice((page - 1) * perPage, page * perPage),
        meta: {
            total: ranked.length,
            page,
            per_page: perPage,
            counts: {
                review: matching.filter((row) => inView(row, "review")).length,
                all: matching.length,
                no_gift: matching.filter((row) => inView(row, "no_gift")).length,
            },
        },
    };
}
