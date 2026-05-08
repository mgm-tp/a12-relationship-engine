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

import * as Path from "path";

import { defineConfig } from "@rsbuild/core";

const PATH = {
	NODE_MODULES: Path.join(__dirname, "node_modules"),
	SRC: Path.join(__dirname, "src"),
	ENTRY: Path.join(__dirname, "src", "cli.ts"),
	OUTPUT: Path.join(__dirname, "build"),
	LIB: Path.join(__dirname, "lib"),
	MODELS: Path.join(__dirname, "..", "showcase", "resources", "models")
};

const config: ReturnType<typeof defineConfig> = defineConfig({
	source: {
		entry: { index: [PATH.ENTRY] }
	},
	output: {
		distPath: { root: PATH.OUTPUT },
		sourceMap: { js: "source-map" } as const,
		target: "node" as const,
		filename: { js: "services-utils.js" } as const,
		copy: [{ from: PATH.MODELS, to: "models" }]
	}
});

export default config;
