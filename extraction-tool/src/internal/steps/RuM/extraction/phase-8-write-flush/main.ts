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

import type { MigrationStepContext } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { EDIT_CLONE_SUFFIX, MULTI_CONTEXT_SEPARATOR } from "../constants.js";

/** State shape required by the P8 flush operation. */
export interface FlushState {
	/** All accumulated models, keyed by model header.id. */
	readonly models: ReadonlyMap<string, object>;
	/** IDs queued for deletion at flush time. */
	readonly deletionIds: ReadonlySet<string>;
}

/** Options controlling flush behavior. */
export interface FlushOptions {
	/** When true, deletion IDs are NOT processed (models are kept). */
	readonly keepModels: boolean;
	/** Workspace-relative directory prefix for written models. Empty string means workspace root. */
	readonly outputDir: string;
	/** Target directory for non-form-model outputs in multi-directory workspaces. Empty string means workspace root. */
	readonly sharedTargetDir?: string;
	/** ID of the input form model to preserve at its original `outputDir` path during multi-directory routing. */
	readonly formModelIdToPreserve?: string;
}

/** Writes accumulated models to the migration context and queues deletions unless `keepModels` is true. */
export function flushState(state: FlushState, context: MigrationStepContext, options: FlushOptions): void {
	const { outputDir } = options;

	for (const [id, model] of state.models) {
		if (options.keepModels && isPreservedBaseOverview(model)) {
			continue;
		}

		let modelPath: string;

		if (options.sharedTargetDir !== undefined && options.formModelIdToPreserve !== undefined) {
			if (id === options.formModelIdToPreserve) {
				modelPath = outputDir ? `${outputDir}/${id}.json` : `${id}.json`;
			} else {
				// Existing workspace models are written back to their original path; new models go to sharedTargetDir.
				const existingEntry = context.findModel(id);

				if (existingEntry !== undefined) {
					modelPath = existingEntry.path;
				} else {
					modelPath = options.sharedTargetDir ? `${options.sharedTargetDir}/${id}.json` : `${id}.json`;
				}
			}
		} else {
			modelPath = outputDir ? `${outputDir}/${id}.json` : `${id}.json`;
		}

		context.addModel({ model, path: modelPath });
	}

	if (!options.keepModels) {
		for (const id of state.deletionIds) {
			context.deleteModel(id);
		}
	}
}

function isPreservedBaseOverview(model: object): boolean {
	const modelHeader = (model as { header?: unknown }).header;

	if (typeof modelHeader !== "object" || modelHeader === null) {
		return false;
	}

	const header = modelHeader as { id?: unknown; modelType?: unknown };

	if (header.modelType !== "overview" || typeof header.id !== "string") {
		return false;
	}

	return (
		!header.id.includes(MULTI_CONTEXT_SEPARATOR) &&
		!header.id.endsWith(EDIT_CLONE_SUFFIX) &&
		!header.id.includes("-new") &&
		!header.id.endsWith("-tableList")
	);
}
