import path from "path";
import { expect, Page, test as base, TestInfo } from "@playwright/test";
import { respond } from "./mockApi";

export type Role = "Admin" | "Finance" | "Scripter" | "Researcher" | "Field Manager";

// The fixtures describe late 2026; a fixed clock keeps "Ends in 28 days" and the screenshots stable.
const FIXED_NOW = new Date("2026-11-02T09:00:00+07:00");

// Web fonts come from Google; without network access the page still renders with the fallback font.
const IGNORED_CONSOLE_ERRORS = [/fonts\.(googleapis|gstatic)\.com/];

export const test = base.extend<{ consoleErrors: string[] }>({
    consoleErrors: [async ({ page }, use) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
        page.on("console", (message) => {
            if (message.type() !== "error") return;
            const text = message.text();
            if (!IGNORED_CONSOLE_ERRORS.some((pattern) => pattern.test(text))) errors.push(text);
        });

        await use(errors);

        // React and MUI report broken props, keys and accessibility mistakes as console errors.
        expect(errors, "console errors").toEqual([]);
    }, { auto: true }],

    page: async ({ page }, use) => {
        await page.clock.setFixedTime(FIXED_NOW);
        await page.route("http://localhost:8000/**", (route) => route.fulfill({ json: respond(route.request().url()) }));
        await use(page);
    },
});

export { expect };

export async function signInAs(page: Page, role: Role = "Admin", name = "Nhan Ho") {
    const [firstName, lastName] = name.split(" ");
    await page.addInitScript((user) => {
        localStorage.setItem("authToken", "e2e-token");
        localStorage.setItem("user", JSON.stringify(user));
    }, { first_name: firstName, last_name: lastName, role, must_change_password: false });
}

// Saves a screenshot for the report and the CI artifact. With E2E_VISUAL=1 it is compared with the
// baseline taken by `npm run test:e2e:baseline` instead (see playwright.config.ts).
export async function capture(page: Page, testInfo: TestInfo, name: string, options: { fullPage?: boolean } = {}) {
    await page.evaluate(() => document.fonts.ready);
    const fullPage = options.fullPage ?? true;

    if (process.env.E2E_VISUAL) {
        await expect(page).toHaveScreenshot(`${name}.png`, { fullPage });
        return;
    }

    const file = path.join(__dirname, "..", "screenshots", testInfo.project.name, `${name}.png`);
    await page.screenshot({ path: file, fullPage, animations: "disabled", caret: "hide" });
    await testInfo.attach(name, { path: file, contentType: "image/png" });
}
