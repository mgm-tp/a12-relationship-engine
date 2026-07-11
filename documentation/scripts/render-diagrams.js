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

import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { resolve, dirname, basename } from "node:path";
import { globSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docRoot = resolve(__dirname, "..");
const diagramDir = resolve(docRoot, "relationship/src/assets/diagrams");
const outputDir = resolve(docRoot, "relationship/src/assets/images/new-architecture");
const targetDir = resolve(docRoot, "target");

mkdirSync(outputDir, { recursive: true });
mkdirSync(targetDir, { recursive: true });

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const puppeteerConfig = resolve(targetDir, "puppeteer-config.json");
const newPath = chromium.executablePath();
let needsWrite = true;

if (existsSync(puppeteerConfig)) {
	try {
		const existing = JSON.parse(readFileSync(puppeteerConfig, "utf-8"));
		needsWrite = existing.executablePath !== newPath;
	} catch {
		needsWrite = true; // malformed file — overwrite
	}
}

if (needsWrite) {
	writeFileSync(puppeteerConfig, JSON.stringify({ executablePath: newPath }));
}

const mmdFiles = globSync(resolve(diagramDir, "*.mmd"));

for (const input of mmdFiles) {
	const name = basename(input, ".mmd");
	const output = resolve(outputDir, `${name}.png`);
	console.log(`Rendering ${name}...`);
	execSync(`mmdc -i "${input}" -o "${output}" -t default -w 1200 -b transparent -p "${puppeteerConfig}"`, {
		stdio: "inherit",
		shell: true
	});
}

console.log("Done.");
