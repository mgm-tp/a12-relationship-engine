/*
 * SPDX-License-Identifier: EUPL-1.2 OR LicenseRef-commercial
 *
 * Copyright (c) 2012-2026 mgm technology partners GmbH
 *
 * Dual License
 * ------------
 * This source file is part of the mgm A12 Platform and available under
 * a choice of two different licenses:
 *
 * 1. Open-Source License - EUPL v1.2
 *    You may redistribute and/or modify this file under the terms of the
 *    European Union Public License, version 1.2 - see https://eupl.eu/.
 *
 * 2. Commercial License
 *    Alternatively, you may obtain a commercial license from
 *    mgm technology partners GmbH, that permits use of this software
 *    under different terms (including support and maintenance services).
 *
 *    Please contact a12-license@mgm-tp.com for more information.
 *
 * You must select and comply with exactly one of the above license options.
 *
 * Warranty Disclaimer (applies to either option)
 * ----------------------------------------------
 * THIS SOFTWARE IS PROVIDED "AS IS" AND WITHOUT WARRANTY OF ANY KIND,
 * WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NON-INFRINGEMENT, EXCEPT WHERE SUCH DISCLAIMERS ARE HELD TO BE
 * LEGALLY INVALID. SEE THE RESPECTIVE LICENSE TEXT FOR DETAILS.
 */

import { devices, defineConfig } from "@playwright/test";

import { DEPRECATED_APP_URL } from "./tests/deprecated/base-url";

if (!process.env.BASE_URL) {
	process.env.BASE_URL = `http://127.0.0.1:17000`;
}

if (!process.env.BASE_ENTRY) {
	process.env.BASE_ENTRY = `composable`;
}

process.env.APP_URL = `${process.env.BASE_URL}/${process.env.BASE_ENTRY}`;

export default defineConfig({
	outputDir: "./target/test-results",
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 3 : 1,
	workers: process.env.CI ? 2 : 4,
	fullyParallel: true,
	reporter: [[process.env.CI ? "list" : "html", { outputFolder: "./target/playwright-report" }]],
	use: {
		baseURL: process.env.APP_URL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure"
	},
	globalSetup: "./support/global-setup",
	globalTeardown: "./support/global-teardown",
	projects: [
		{
			name: "readonly",
			use: { ...devices["Desktop Chrome"] },
			testDir: "./tests/readonly-tests"
		},
		{
			name: "writeable",
			use: { ...devices["Desktop Chrome"] },
			testDir: "./tests/writeable-tests",
			workers: 1,
			dependencies: ["readonly"]
		},
		{
			name: "deprecated-readonly",
			use: { ...devices["Desktop Chrome"], baseURL: DEPRECATED_APP_URL },
			testDir: "./tests/deprecated/readonly-tests"
		},
		{
			name: "deprecated-writeable",
			use: { ...devices["Desktop Chrome"], baseURL: DEPRECATED_APP_URL },
			testDir: "./tests/deprecated/writeable-tests",
			workers: 1,
			dependencies: ["writeable", "deprecated-readonly"]
		}
	],
	webServer: process.env.PLAYWRIGHT_NO_WEB_SERVER
		? undefined
		: {
				command: 'pnpm -F "*-showcase" -F "*-server" start:app',
				url: "http://localhost:17090/actuator/health",
				reuseExistingServer: true,
				cwd: "../",
				stdout: "pipe",
				timeout: 240 * 1000
			}
});
