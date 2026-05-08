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

import Path from "node:path";
import Fs from "node:fs/promises";

const HEADER_MARKER = "SPDX-License-Identifier: EUPL-1.2 OR LicenseRef-commercial";
const ADOC_DIR = "documentation";

async function findAdocFiles(dir) {
	const entries = await Fs.readdir(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const fullPath = Path.join(dir, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await findAdocFiles(fullPath)));
		} else if (entry.name.endsWith(".adoc")) {
			files.push(fullPath);
		}
	}

	return files;
}

const files = await findAdocFiles(ADOC_DIR);
const missing = [];

for (const file of files) {
	const content = await Fs.readFile(file, "utf-8");
	const head = content.slice(0, 500);

	if (!head.includes(HEADER_MARKER)) {
		missing.push(file);
	}
}

if (missing.length > 0) {
	console.error(`Missing copyright header in ${missing.length} asciidoc file(s):`);

	for (const file of missing) {
		console.error(`  ${file}`);
	}

	console.error(
		"\nAdd the copyright header from the template:\n" +
			"  repo-documents/templates/community/asciidoc_copyright_header_community.adoc"
	);
	process.exit(1);
}

console.log(`All ${files.length} asciidoc file(s) have the copyright header.`);
