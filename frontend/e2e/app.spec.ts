import * as XLSX from "xlsx";
import { capture, expect, FIXED_NOW, signInAs, test } from "./support/test";

const PROJECTS = "/project-management/projects";
const PROJECT = `${PROJECTS}/1`;

test.describe("signed out", () => {
    test("login", async ({ page }, testInfo) => {
        await page.goto("/login");
        await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Sign in" })).toBeDisabled();
        await capture(page, testInfo, "login");
    });

    test("unknown page shows the not-found screen", async ({ page }, testInfo) => {
        await page.goto("/does-not-exist");
        await expect(page.getByText("Page not found")).toBeVisible();
        await capture(page, testInfo, "error-404");
    });
});

test.describe("admin", () => {
    test.beforeEach(async ({ page }) => {
        await signInAs(page, "Admin");
    });

    test("projects list with status tabs", async ({ page }, testInfo) => {
        await page.goto(PROJECTS);
        await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
        await expect(page.getByRole("tab", { name: /In field\s*12/ })).toBeVisible();
        await expect(page.getByText("Vinamilk Brand Health Tracking Q4")).toBeVisible();
        await capture(page, testInfo, "projects");

        await page.getByRole("tab", { name: /In field/ }).click();
        await expect(page.getByText("Heineken On-Trade Retail Audit")).toBeHidden();
    });

    test("command palette opens a project", async ({ page }) => {
        await page.goto(PROJECTS);
        await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
        await page.keyboard.press("Control+k");
        await page.keyboard.type("vina");
        await expect(page.getByRole("option", { name: /Vinamilk Brand Health Tracking Q4/ })).toBeVisible();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/projects\/1\/overview$/);
    });

    test("project overview", async ({ page }, testInfo) => {
        await page.goto(`${PROJECT}/overview`);
        await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
        await expect(page.getByText("612 / 900")).toBeVisible();
        await expect(page.getByText("12 failed")).toBeVisible();
        await capture(page, testInfo, "project-overview");
    });

    test("gifts: tabs, failure reason and bulk selection", async ({ page }, testInfo) => {
        await page.goto(`${PROJECT}/gifts`);
        await expect(page.getByRole("tab", { name: /Failed\s*12/ })).toBeVisible();
        await expect(page.getByText("12 gifts failed.", { exact: false })).toBeVisible();

        await page.getByRole("checkbox", { name: "Select INS-48210" }).check();
        await expect(page.getByText("1 respondent selected")).toBeVisible();
        await expect(page.getByText("50,000 ₫ in total")).toBeVisible();
        await capture(page, testInfo, "gifts-bulk");

        await page.getByRole("tab", { name: /Failed/ }).click();
        await expect(page.getByText("Insufficient merchant balance")).toBeVisible();
    });

    test("gifts: test respondents are labelled and an import with tests says why", async ({ page }, testInfo) => {
        await page.route(`http://localhost:8000/api${PROJECT}/offline/respondents/store`, (route) => route.fulfill({
            json: { status_code: 900, message: "Import successfully", imported_count: 2, live_count: 1, test_count: 1, project_status: "in coming" },
        }));
        await page.goto(`${PROJECT}/gifts`);

        await expect(page.getByRole("row").filter({ hasText: "INS-48252" }).getByText("Test", { exact: true })).toBeVisible();
        await expect(page.getByRole("row").filter({ hasText: "INS-48210" }).getByText("Test", { exact: true })).toHaveCount(0);

        const sheet = XLSX.utils.json_to_sheet([
            { InstanceID: "9001", Shell_ChainID: "SC1", SamplePoint: "HN_A1", Province: "Hà Nội", InterviewerID: "HN001", RespondentPhoneNumber: "0901234567", PhoneNumber: "0901234567", Email: "", PriceLevel: "main", Channel: "vinnet" },
            { InstanceID: "9002", Shell_ChainID: "SC1", SamplePoint: "_defaultsp", Province: "Hà Nội", InterviewerID: "HN001", RespondentPhoneNumber: "0907654321", PhoneNumber: "0907654321", Email: "", PriceLevel: "main", Channel: "vinnet" },
        ]);
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, "Respondents");
        await page.locator('input[type="file"]').setInputFiles({
            name: "respondents.xlsx",
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            buffer: XLSX.write(book, { type: "buffer", bookType: "xlsx" }),
        });

        const banner = page.getByRole("alert").filter({ hasText: "Imported 2 respondents: 1 live, 1 test" });
        await expect(banner).toBeVisible();
        await expect(banner).toContainText("This project is Upcoming");
        await capture(page, testInfo, "gifts-import-with-tests", { fullPage: false });
    });

    test("finance", async ({ page }, testInfo) => {
        await page.goto("/transaction-manager/transactions");
        await expect(page.getByRole("heading", { name: "Finance", level: 1 })).toBeVisible();
        await expect(page.getByText("Low balance")).toBeVisible();
        await expect(page.getByText(/weeks? left at the last 30 days/).first()).toBeVisible();
        await capture(page, testInfo, "finance");
    });

    test("accounts row menu and history drawer", async ({ page }, testInfo) => {
        await page.goto("/account-management/accounts");
        await expect(page.getByRole("heading", { name: "Accounts", level: 1 })).toBeVisible();
        await capture(page, testInfo, "accounts");

        await page.getByRole("button", { name: "Actions for nhan.ho@ipsos.com" }).click();
        await page.getByRole("menuitem", { name: "View history" }).click();
        await expect(page.getByRole("dialog", { name: "Account history" })).toBeVisible();
    });

    test("quotation header and copy link", async ({ page, context }, testInfo) => {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await page.goto(`${PROJECT}/quotation`);
        await expect(page.getByText("Waiting for the Field Manager")).toBeVisible();
        await capture(page, testInfo, "quotation", { fullPage: false });

        await page.getByRole("button", { name: "Copy link" }).click();
        await expect(page.getByText("Link to version 3 copied.")).toBeVisible();
    });

    test("settings edit dialog", async ({ page }) => {
        await page.goto(`${PROJECT}/settings`);
        await page.getByRole("button", { name: "Edit" }).click();
        await expect(page.getByRole("dialog", { name: "Edit project information" })).toBeVisible();
    });

    test("other project pages render", async ({ page }) => {
        for (const [path, heading] of [
            ["parttime-employees", "Interviewers"],
            ["cati-settings", "CATI settings"],
            ["transactions", "Transactions"],
            ["transaction-statistics", "Transaction statistics"],
            ["assignment", "Assignment"],
        ]) {
            await page.goto(`${PROJECT}/${path}`);
            await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
        }
    });
});

test.describe("session expiry", () => {
    const EXPIRED_MESSAGE = "Your session has expired. Please sign in again.";
    const setExpiresAt = (page: import("@playwright/test").Page, at: number) =>
        page.addInitScript((value) => localStorage.setItem("authTokenExpiresAt", String(value)), at);

    test("an expired session goes straight to sign-in", async ({ page }) => {
        await signInAs(page, "Admin");
        await setExpiresAt(page, FIXED_NOW.getTime() - 1000);
        await page.goto(PROJECTS);

        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByText(EXPIRED_MESSAGE)).toBeVisible();
        expect(await page.evaluate(() => localStorage.getItem("authToken"))).toBeNull();
    });

    test("the session ends on time while the page stays open", async ({ page }) => {
        await signInAs(page, "Admin");
        await setExpiresAt(page, FIXED_NOW.getTime() + 1000);
        await page.goto(PROJECTS);
        await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();

        await page.clock.setFixedTime(FIXED_NOW.getTime() + 2000);
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByText(EXPIRED_MESSAGE)).toBeVisible();
    });

    test("signing in stores the expiry and coming back to the tab after it ends signs out", async ({ page }) => {
        await page.route("http://localhost:8000/api/login", (route) => route.fulfill({
            json: {
                status_code: 200,
                message: "Login successfully",
                token: "fresh-token",
                expires_in: 3600,
                user: { first_name: "Nhan", last_name: "Ho", role: "Admin", must_change_password: false },
            },
        }));
        await page.goto("/login");
        await page.getByLabel("Email").fill("nhan.ho@ipsos.com");
        await page.getByLabel("Password", { exact: true }).fill("secret");
        await page.getByRole("button", { name: "Sign in" }).click();
        await expect(page).toHaveURL(new RegExp(`${PROJECTS}$`));
        expect(await page.evaluate(() => Number(localStorage.getItem("authTokenExpiresAt"))))
            .toBe(FIXED_NOW.getTime() + 3600 * 1000);

        await page.clock.setFixedTime(FIXED_NOW.getTime() + 3601 * 1000);
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByText(EXPIRED_MESSAGE)).toBeVisible();
    });
});

test.describe("finance role", () => {
    test("sees finance pages but no admin pages", async ({ page }, testInfo) => {
        await signInAs(page, "Finance", "Thu Vo");
        await page.goto(`${PROJECT}/overview`);
        await expect(page.getByText("Paid out")).toBeVisible();
        await expect(page.getByText("Gifts sent")).toBeHidden();
        await expect(page.getByRole("link", { name: "Accounts" })).toBeHidden();
        await capture(page, testInfo, "project-overview-finance-role");
    });
});

test.describe("phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("navigation drawer", async ({ page }, testInfo) => {
        await signInAs(page, "Admin");
        await page.goto(PROJECTS);
        await page.getByRole("button", { name: "Open navigation" }).click();
        await expect(page.getByRole("link", { name: "Finance" })).toBeVisible();
        await capture(page, testInfo, "mobile-navigation", { fullPage: false });
    });
});
