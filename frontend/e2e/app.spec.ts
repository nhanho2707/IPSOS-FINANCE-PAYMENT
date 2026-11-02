import { capture, expect, signInAs, test } from "./support/test";

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
