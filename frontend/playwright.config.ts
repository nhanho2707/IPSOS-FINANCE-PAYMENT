import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run the real front-end against the mocked API in e2e/support/mockApi.ts.
//   npm run test:e2e           smoke tests; screenshots go to e2e/screenshots (CI uploads them per PR)
//   npm run test:e2e:baseline  take reference screenshots (on the base branch)
//   npm run test:e2e:visual    compare against those references; diffs open in the HTML report
export default defineConfig({
    testDir: "./e2e",
    snapshotDir: "./e2e/.baseline",
    snapshotPathTemplate: "{snapshotDir}/{projectName}/{arg}{ext}",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/report" }]],
    outputDir: "e2e/test-results",
    use: {
        baseURL: "http://localhost:3000",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    expect: {
        toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled", caret: "hide" },
    },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    ],
    webServer: {
        command: "npm start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { BROWSER: "none", PORT: "3000" },
    },
});
