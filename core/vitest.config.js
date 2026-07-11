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

import { defineConfig } from "vitest/config";
import pluginReact from "@vitejs/plugin-react";

export default defineConfig({
	/** Suppress annoying unsupported es2025 warning message from esbuild, which might crash Jenkins instance */
	esbuild: { tsconfigRaw: { compilerOptions: { target: "es2024", useDefineForClassFields: true } } },
	test: {
		setupFiles: ["./src/test/utils/vitest.setup.ts"],
		environment: "jsdom",
		include: ["src/**/*.spec.ts", "src/**/*.spec.tsx", "src/**/*.test.tsx", "src/**/*.test.ts"],
		deps: { optimizer: { web: { enabled: true } }, web: { transformAssets: true } },
		maxWorkers: process.env.CI ? 4 : "50%",
		environmentOptions: { jsdom: { userAgent: "node.js" } },
		pool: "vmForks",
		clearMocks: true,
		testTimeout: 60000,
		hookTimeout: 60000
	},
	plugins: [pluginReact()]
});
