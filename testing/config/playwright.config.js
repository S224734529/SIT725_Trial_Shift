const path = require("path");
const { defineConfig, devices } = require("@playwright/test");

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";
const projectRoot = path.resolve(__dirname, "../..");
const appEntry = path.join(projectRoot, "src", "app.js");
const webServerCommand = `npx cross-env PORT=4173 NODE_ENV=test node "${appEntry}"`;

module.exports = defineConfig({
  testDir: path.resolve(__dirname, "../e2e/specs"),
  fullyParallel: true,
  timeout: 60000,
  expect: {
    timeout: 5000,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: path.resolve(__dirname, "../reports/playwright"), open: "never" }],
  ],
  use: {
    baseURL,
    headless: false,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
