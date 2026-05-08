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

import Fs from "node:fs/promises";
import Path from "node:path";

import { create } from "browser-sync";

import { compileDoc } from "./compile.js";
import Config from "./config.js";

const browserSync = create();

async function compile() {
	await compileDoc();
	await compileEntryPage();
}

compile()
	.then(async () => {
		browserSync.init({
			port: 17001,
			open: false,
			watch: true,
			online: false,
			logLevel: "silent",
			server: { baseDir: Config.buildDir }
		});

		await Promise.all([watchDirectory(Config.relationship.srcDir), watchDirectory(Config.crud.srcDir)]);
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});

async function watchDirectory(dir) {
	for await (const { filename } of Fs.watch(dir, { recursive: true })) {
		console.log(`Detected changes on file: ${filename} in ${dir}`);
		await compile();
		browserSync.reload();
	}
}

process.on("SIGINT", () => {
	process.exit();
});

async function compileEntryPage() {
	const content = (await Fs.readdir(Config.buildDir, { withFileTypes: true }))
		.filter((dir) => dir.isDirectory())
		.map(({ name }) => `<li><a href="./${name}">${name}</a></li>`)
		.join("\n");

	await Fs.writeFile(Path.join(Config.buildDir, "index.html"), `<ul>${content}</ul>`, "utf-8");
}
