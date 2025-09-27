const path = require("path");

const rootDir = path.resolve(__dirname, "../..");

module.exports = {
  rootDir,
  testEnvironment: "node",
  testMatch: ["<rootDir>/testing/api/specs/**/*.spec.js"],
  setupFilesAfterEnv: ["<rootDir>/testing/api/setup.js"],
  collectCoverageFrom: ["src/**/*.{js,jsx}"],
  coveragePathIgnorePatterns: ["/node_modules/"],
  reporters: [
    "default",
    [
      "jest-html-reporters",
      {
        publicPath: path.resolve(__dirname, "../reports/jest"),
        filename: "index.html",
        expand: true,
        pageTitle: "API Test Report",
      },
    ],
  ],
};
