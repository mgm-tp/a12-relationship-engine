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

import type { GenericModel, MigrationStepContext } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

interface ExtractionUserConfig {
	readonly keepModels?: boolean;
	readonly "keep-models"?: boolean;
}

import { hasBindingAnnotation } from "./model-accessors/type-guards.js";
import { getHeader, getModelReferences } from "./model-accessors/header-accessors.js";

/**
 * Determines whether the extraction step has already been applied to this model.
 *
 * A model is considered already migrated when:
 * - It has `relationship-ui` entries in its `header.modelReferences`
 * - AND (the `bindingConfiguration` annotation is absent OR the `keepModels`
 *   flag is set in user config)
 *
 * When `keepModels` is active, models are considered "migrated enough" to
 * skip re-extraction even if the annotation is still present.
 *
 * @param model - The form model to check.
 * @param ctx - Optional migration step context with user config.
 * @returns True if the extraction has been applied.
 */
export function extractionIsMigrated(model: GenericModel, ctx?: MigrationStepContext): boolean {
	const header = getHeader(model);

	if (header === undefined) {
		return false;
	}

	const refs = getModelReferences(model);
	const hasRelationshipUiRefs = refs.some((ref) => ref.modelType === "relationship-ui");

	if (!hasRelationshipUiRefs) {
		return false;
	}

	const hasBindingConfigAnnotation = hasBindingAnnotation(header);

	if (!hasBindingConfigAnnotation) {
		return true;
	}

	const userConfig = readUserConfig(ctx);
	const keepModels = isKeepModelsEnabled(userConfig);

	if (keepModels) {
		return false;
	}

	return true;
}

/**
 * Reads extraction configuration flags from the migration step context.
 *
 * @param ctx - Migration step context with optional user config.
 * @returns The resolved extraction flags.
 */
export function readConfigFlags(ctx: MigrationStepContext | undefined): {
	readonly keepModels: boolean;
} {
	const userConfig = readUserConfig(ctx);

	return {
		keepModels: isKeepModelsEnabled(userConfig)
	};
}

/**
 * Safely reads the raw userConfig object from a MigrationStepContext.
 *
 * SAFETY: raw migration config boundary — only the `keepModels` and
 * `keep-models` flags are intentionally observed here.
 *
 * @internal
 */
function readUserConfig(ctx: unknown): ExtractionUserConfig | undefined {
	if (typeof ctx !== "object" || ctx === null) {
		return undefined;
	}

	const userConfig = Reflect.get(ctx, "userConfig");

	if (!isExtractionUserConfig(userConfig)) {
		return undefined;
	}

	return userConfig;
}

/**
 * Domain-specific parser for extraction user config.
 *
 * Accepts only the fields used by extraction config logic and ensures they are booleans when present.
 *
 * @internal
 */
function isExtractionUserConfig(value: unknown): value is ExtractionUserConfig {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const camelCaseKeepModels = Reflect.get(value, "keepModels");

	if (camelCaseKeepModels !== undefined && typeof camelCaseKeepModels !== "boolean") {
		return false;
	}

	const kebabCaseKeepModels = Reflect.get(value, "keep-models");

	if (kebabCaseKeepModels !== undefined && typeof kebabCaseKeepModels !== "boolean") {
		return false;
	}

	return true;
}

/**
 * Accept both keepModels (file config) and keep-models (CLI option passthrough).
 *
 * @internal
 */
function isKeepModelsEnabled(userConfig: ExtractionUserConfig | undefined): boolean {
	const camelCaseKeepModels = userConfig?.keepModels;

	if (camelCaseKeepModels === true) {
		return true;
	}

	const kebabCaseKeepModels = userConfig?.["keep-models"];

	return kebabCaseKeepModels === true;
}
