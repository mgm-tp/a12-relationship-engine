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

/** Model families with copied upstream model artifacts. */
export type ResolvedModelType = "form" | "overview";

/** Metadata for model artifacts copied from upstream model-migration packages. */
export interface ResolvedModelVersionMetadata {
	readonly modelType: ResolvedModelType;
	readonly entryName: string;
	readonly packageName: string;
	readonly stepsPath: string;
	readonly versionRange: string;
	readonly version: string;
	readonly selectedVersionFolder: string;
	readonly copiedFiles: readonly string[];
}

/** Resolved model versions selected by tools/copy-models.ts. */
export const RESOLVED_MODEL_VERSIONS = {
	overview: {
		modelType: "overview",
		entryName: "OverviewModel",
		packageName: "@com.mgmtp.a12.overviewengine/overviewengine-model-migration",
		stepsPath: "src/internal/steps",
		versionRange: ">=39.0.0-pre.5",
		version: "39.0.0",
		selectedVersionFolder: "version-39.0.0",
		copiedFiles: ["overview-model.ts"]
	},
	form: {
		modelType: "form",
		entryName: "FormModel",
		packageName: "@com.mgmtp.a12.formengine/formengine-model-migration",
		stepsPath: "src/main/steps",
		versionRange: ">=37.5.0",
		version: "39.0.0",
		selectedVersionFolder: "version-39.0.0",
		copiedFiles: ["form-model.ts"]
	}
} as const satisfies Record<ResolvedModelType, ResolvedModelVersionMetadata>;

/** Resolved form-model version selected by tools/copy-models.ts. */
export const FORM_MODEL_VERSION = RESOLVED_MODEL_VERSIONS.form.version;

/** Resolved overview-model version selected by tools/copy-models.ts. */
export const OVERVIEW_MODEL_VERSION = RESOLVED_MODEL_VERSIONS.overview.version;
