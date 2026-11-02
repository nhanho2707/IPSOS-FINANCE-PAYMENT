// In-memory stand-in for the Laravel API, so the e2e suite runs without a backend or database.
// Shapes follow the real resources (ProjectResource, ProjectRespondentResource, ...); values are fictional.
import quotationSchema from "../fixtures/quotation_schema.json";
import operationsSchema from "../fixtures/operations_schema.json";

type Json = Record<string, unknown>;

const provinces = (main: number, booster: number) => [
    { id: "1", name: "Hà Nội", sample_size_main: main, price_main: 100000, sample_size_booters: booster, price_boosters: 80000 },
    { id: "2", name: "Hồ Chí Minh", sample_size_main: main, price_main: 100000, sample_size_booters: 0, price_boosters: 0 },
];

const OWNERS = ["Quang Le", "Thu Vo", "Mai Nguyen", "Hoang Pham"];

const project = (
    id: number, symphony: string, code: string, name: string, status: string,
    start: string, end: string, done: number, main: number, booster: number
) => ({
    id, symphony, internal_code: code, project_name: name, status, disabled: false, platform: "iField",
    teams: ["Consumer"], project_types: ["F2F"], planned_field_start: start, planned_field_end: end,
    provinces: provinces(main, booster), count_respondents: done, count_employees: 12,
    has_submitted_quotation: true, remember_token: "a8f3c2d1e9b74f60a1c2",
    created_user_id: { id: 1 + (id % 4), name: OWNERS[id % 4], email: "owner@ipsos.com" },
});

export const projects = [
    project(1, "26-041293-01", "VN2604", "Vinamilk Brand Health Tracking Q4", "on going", "2026-10-01", "2026-11-30", 612, 400, 100),
    project(2, "26-039871-01", "VN2598", "Unilever Shampoo Concept Test – CLT", "in coming", "2026-11-10", "2026-12-05", 0, 300, 0),
    project(3, "26-037702-02", "VN2587", "Techcombank Customer Experience Panel Wave 7", "on going", "2026-09-15", "2026-12-31", 1840, 1000, 200),
    project(4, "26-035511-01", "VN2571", "Heineken On-Trade Retail Audit", "completed", "2026-07-01", "2026-08-31", 820, 400, 0),
    project(5, "26-034480-01", "VN2563", "Masan Seasoning Usage & Attitude", "on hold", "2026-08-20", "2026-10-30", 233, 500, 100),
    project(6, "26-033017-03", "VN2555", "Grab Food Delivery NPS Tracker", "on going", "2026-06-01", "2026-12-15", 2950, 1500, 300),
    project(7, "26-031904-01", "VN2549", "Highlands Coffee Menu Test – HUT", "planned", "2026-12-01", "2027-01-15", 0, 250, 0),
    project(8, "26-030288-01", "VN2537", "Samsung Galaxy Brand Funnel", "cancelled", "2026-05-01", "2026-06-15", 41, 300, 0),
    project(9, "26-029115-02", "VN2528", "Shopee Seller Satisfaction CATI", "completed", "2026-04-10", "2026-05-30", 1200, 1200, 0),
    project(10, "26-028770-01", "VN2519", "Nestlé Milo Kids Snacking Diary", "on going", "2026-09-01", "2026-11-20", 410, 600, 0),
];

const PHONES = ["0903412887", "0912556201", "0987330145", "0935221908", "0978118662", "0909774315", "0918603274", "0962441090", "0945812336", "0899205147"];
const PROVINCE_NAMES = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Cần Thơ", "Hải Phòng"];
const GIFT_STATUSES = ["pending", "pending", "success", "pending", "failed", "success", "pending", "refused", "success", "pending"];
const INTERVIEWERS = ["Nguyễn Văn An", "Trần Thị Bình", "Lê Minh Châu", "Phạm Văn Dũng", "Võ Thu Giang"];

export const respondents = Array.from({ length: 10 }, (_, i) => ({
    id: 100 + i,
    respondent_id: `INS-${48210 + i * 7}`,
    shell_chainid: `SC${903100 + i * 13}`,
    province_name: PROVINCE_NAMES[i % 5],
    employee_id: `PVV${2040 + i * 3}`,
    employee_name: INTERVIEWERS[i % 5],
    respondent_phone_number: PHONES[i],
    phone_number: PHONES[(i + 3) % 10],
    email: i % 3 === 0 ? `resp${i}@gmail.com` : "",
    status: GIFT_STATUSES[i],
    status_label: GIFT_STATUSES[i] === "failed" ? "Insufficient merchant balance" : GIFT_STATUSES[i],
    environment: "live",
    token: "tk",
    price_level: [50000, 100000, 50000, 200000, 100000][i % 5],
    channel: i % 3 === 0 ? "gotit" : "vinnet",
}));

const FULL_NAMES = ["Nguyễn Văn An", "Nguyễn Thị Bình", "Nguyễn Minh Châu", "Nguyễn Văn Dũng", "Nguyễn Thu Giang", "Nguyễn Thị Hà", "Nguyễn Đăng Khoa", "Nguyễn Mỹ Linh", "Nguyễn Quang Minh", "Nguyễn Bảo Ngọc"];

const transactions = Array.from({ length: 10 }, (_, i) => ({
    id: String(500 + i),
    transaction_id: `TX${770100 + i}`,
    symphony: "26-041293-01",
    internal_code: "VN2604",
    project_name: "Vinamilk Brand Health Tracking Q4",
    province_name: PROVINCE_NAMES[i % 5],
    employee_id: `PVV${2040 + i * 3}`,
    full_name: FULL_NAMES[i],
    interview_start: `2026-10-${String(10 + i).padStart(2, "0")} 09:${String(10 + i * 3).padStart(2, "0")}:00`,
    interview_end: `2026-10-${String(10 + i).padStart(2, "0")} 09:${String(42 + i).padStart(2, "0")}:00`,
    shell_chainid: `SC${903100 + i * 13}`,
    respondent_id: `INS-${48210 + i * 7}`,
    respondent_phone_number: PHONES[i],
    phone_number: PHONES[(i + 3) % 10],
    channel: i % 3 === 0 ? "gotit" : "vinnet",
    service_code: i % 3 === 0 ? "GOTIT-E50" : "S0002",
    amount: [50000, 100000, 50000, 100000, 200000][i % 5],
    transaction_status: "success",
    created_at: `2026-10-${String(10 + i).padStart(2, "0")} 10:02:11`,
}));

const employees = Array.from({ length: 10 }, (_, i) => ({
    id: 300 + i,
    employee_id: `PVV${2040 + i * 3}`,
    first_name: "Nguyễn",
    last_name: "An",
    full_name: FULL_NAMES[i],
    vinnet_total: 10 + i,
    gotit_total: i,
    other_total: i % 2,
    transaction_total: 10 + 2 * i + (i % 2),
}));

const ACCOUNT_ROWS: [string, string, string, string, boolean, boolean][] = [
    ["Nhan Ho", "nhan.ho@ipsos.com", "Admin", "Data Science", true, false],
    ["Lan Tran", "lan.tran@ipsos.com", "Finance", "Finance", true, false],
    ["Quang Le", "quang.le@ipsos.com", "Researcher", "Consumer", true, false],
    ["Huong Pham", "huong.pham@ipsos.com", "Field Manager", "Field Operations", true, true],
    ["Tuan Vo", "tuan.vo@ipsos.com", "Scripter", "Data Science", true, false],
    ["Mai Nguyen", "mai.nguyen@ipsos.com", "Researcher", "Public Affairs", false, false],
    ["Khoa Dang", "khoa.dang@ipsos.com", "Field Manager", "Field Operations", true, false],
];

const accounts = ACCOUNT_ROWS.map(([name, email, role, department, isActive, mustChange], i) => ({
    id: i + 1, name, email, first_name: name.split(" ")[0], last_name: name.split(" ")[1], role, department,
    is_active: isActive, must_change_password: mustChange,
    last_login_at: `2026-10-${28 - i} 08:${10 + i}:00`, created_at: `2025-0${(i % 9) + 1}-12 09:00:00`,
}));

const hourly = (peak: number) => Object.fromEntries(Array.from({ length: 24 }, (_, h) => [
    `${String(h).padStart(2, "0")}-${String((h + 1) % 24).padStart(2, "0")}`,
    Math.max(0, Math.round(peak * Math.exp(-((h - 14) ** 2) / 18))),
]));

const statistics = {
    total: 1834,
    total_amount: 158200000,
    by_channel: { vinnet: { count: 1210, amount: 98400000 }, gotit: { count: 600, amount: 57800000 }, other: { count: 24, amount: 2000000 } },
    interview_time_buckets: hourly(160),
    gift_time_buckets: hourly(140),
    gap_buckets: { "< -5 min": 14, "-5–0 min": 22, "0–15 min": 911, "15–60 min": 503, "1–6 h": 220, "6–24 h": 81, "> 1 day": 37 },
    gap_median_minutes: 12,
    gap_unknown: 31,
    gap_offline: 15,
    anomaly_tolerance_minutes: 5,
    anomalies: Array.from({ length: 14 }, (_, i) => ({
        respondent_id: `INS-${48210 + i * 7}`, phone: PHONES[i % 10], channel: i % 2 ? "vinnet" : "gotit", employee_id: `PVV${2040 + i}`,
        employee_name: FULL_NAMES[i % 10], interview_end: `2026-10-${10 + (i % 9)} 10:${20 + i}:00`,
        gift_time: `2026-10-${10 + (i % 9)} 10:${5 + i}:00`, amount: 50000, gap_minutes: -(6 + i * 4),
    })),
    anomalies_total: 36,
};

const person = (name: string) => ({ id: name.length, name, email: `${name.toLowerCase().replace(" ", ".")}@ipsos.com` });

const versions = [
    { id: 3, version: 3, status: "submitted", quotation_data: { project_name: "Vinamilk Brand Health Tracking Q4", internal_code: "VN2604", client_name: "Vinamilk", project_types: ["F2F"] }, feedbacks: {}, created_user: person("Quang Le"), created_at: "2026-10-21T08:20:00Z", fm_confirmed_user: null, fm_confirmed_at: null, approved_user: null, approved_at: null },
    { id: 2, version: 2, status: "draft", quotation_data: {}, feedbacks: {}, created_user: person("Quang Le"), created_at: "2026-10-18T08:20:00Z", fm_confirmed_user: null, fm_confirmed_at: null, approved_user: null, approved_at: null },
    { id: 1, version: 1, status: "approved", quotation_data: {}, feedbacks: {}, created_user: person("Quang Le"), created_at: "2026-10-02T08:20:00Z", fm_confirmed_user: person("Huong Pham"), fm_confirmed_at: "2026-10-05T08:20:00Z", approved_user: person("Nhan Ho"), approved_at: "2026-10-06T08:20:00Z" },
];

const prices = PROVINCE_NAMES.map((name, i) => ({
    province_id: i + 1, province_name: name, price_type: i % 2 ? "booster" : "main",
    sample_size: 100 + i * 20, price: 100000, price_1: 50000, price_2: 0, price_3: 0, price_4: 0, price_5: 0,
}));

const paginated = (data: unknown[], total: number, message: string) => ({
    status_code: 200, message, data, meta: { total, last_page: Math.ceil(total / 10), current_page: 1, per_page: 10 } as Json,
});

const countBy = <T extends { status: string }>(rows: T[], statuses: string[]) =>
    Object.fromEntries(statuses.map((status) => [status, rows.filter((row) => row.status === status).length]));

const PROJECT_STATUSES = ["planned", "in coming", "on going", "completed", "on hold", "cancelled"];

export function respond(url: string): unknown {
    const { pathname: path, searchParams: query } = new URL(url);

    if (path.endsWith("/project-management/projects")) {
        const term = (query.get("searchTerm") || "").toLowerCase();
        const status = query.get("status");
        const perPage = Number(query.get("perPage") || 10);
        const searched = term
            ? projects.filter((p) => [p.project_name, p.internal_code, p.symphony].some((v) => v.toLowerCase().includes(term)))
            : projects;
        const list = status ? searched.filter((p) => p.status === status) : searched;
        const body = paginated(list.slice(0, perPage), term || status ? list.length : 47, "List of projects requested successfully");
        // Without a search the list stands for the full 47 projects, so the tab counts do too.
        body.meta.status_counts = term
            ? countBy(searched, PROJECT_STATUSES)
            : { planned: 4, "in coming": 6, "on going": 12, completed: 19, "on hold": 3, cancelled: 3 };
        return body;
    }
    if (/\/projects\/\d+\/show$/.test(path)) return { status_code: 200, data: projects[0] };
    if (path.endsWith("/project-management/metadata")) {
        return {
            data: {
                projects,
                project_types: [{ id: 1, name: "F2F" }, { id: 2, name: "CATI" }, { id: 3, name: "CLT" }, { id: 4, name: "HUT" }],
                departments: [{ id: 1, name: "Consumer" }, { id: 2, name: "Finance" }],
                roles: [{ id: 1, name: "Admin", department_id: 1 }],
                teams: [{ id: 1, name: "Consumer" }],
                users: accounts.map((a) => ({ id: a.id, name: a.name, email: a.email })),
            },
        };
    }
    if (/offline\/respondents\/show$/.test(path)) {
        const status = query.get("status");
        const term = (query.get("searchTerm") || "").replace(/\s+/g, "");
        const searched = term
            ? respondents.filter((r) => [r.respondent_id, r.phone_number, r.respondent_phone_number].some((v) => v.includes(term)))
            : respondents;
        const list = status ? searched.filter((r) => r.status === status) : searched;
        const body = paginated(list, term || status ? list.length : 612, "List of respondents requested successfully");
        body.meta.status_counts = term
            ? countBy(searched, ["pending", "success", "failed", "refused"])
            : { pending: 380, success: 212, failed: 12, refused: 8 };
        return body;
    }
    if (/transactions\/show$/.test(path)) return paginated(transactions, 1834, "Successful request.");
    if (/transactions\/statistics$/.test(path)) return { status_code: 200, data: statistics };
    if (/\/\d+\/employees$/.test(path)) return paginated(employees, 12, "List of employees requested successfully");
    if (path.endsWith("/users/show")) return paginated(accounts, 7, "Successfully");
    if (path.endsWith("/vinnet/merchantinfo")) return { status_code: 200, data: JSON.stringify({ deposited: 500000000, spent: 412350000, balance: 87650000 }) };
    if (/gotit\/account\/.+\/view$/.test(path)) return { deposited: 300000000, balance: 64200000, spent: 235800000 };
    if (path.endsWith("/quotation/versions")) return { project: projects[0], versions, message: "Successful." };
    if (path.endsWith("/quotation-template")) return quotationSchema;
    if (path.endsWith("/operations-template")) return operationsSchema;
    if (/versions\/\d+\/operations$/.test(path)) return { data: { id: 1, status: "draft", operations_data: {} }, message: "" };
    if (path.endsWith("/provinces/prices")) return { data: prices };
    if (path.endsWith("/old/provinces")) return { data: PROVINCE_NAMES.map((name, i) => ({ id: i + 1, name })) };
    if (path.endsWith("/notifications/unread-count")) return { data: 0 };
    return { status_code: 200, data: [], meta: { total: 0, last_page: 1 }, message: "" };
}
