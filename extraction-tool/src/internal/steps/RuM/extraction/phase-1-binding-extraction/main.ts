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

import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { isBindingModel } from "../model-accessors/type-guards.js";
import { getAnnotations } from "../model-accessors/header-accessors.js";
import type { PipelineContext, BindingResult as P1BindingResult, BindingResult as P2BindingResult } from "../types.js";

import { convertLegacyBinding } from "./binding-converter.js";
import { isUiConfigurationBinding } from "./binding-validator.js";

/**
 * Phase 1 orchestrator: parses the `bindingConfiguration` annotation from a
 * form model, validates each binding entry, converts legacy bindings to the
 * new RelationshipUiModel format, and returns the extracted binding results.
 *
 * Flow:
 * 1. Parse bindingConfiguration annotation from form model header
 * 2. JSON.parse the annotation value
 * 3. Validate each binding with isUiConfigurationBinding
 * 4. Detect name collisions and deduplicate
 * 5. Convert each valid binding via convertLegacyBinding
 * 6. Build elementBindingMap (elementId → RuM header.id)
 *
 * @param formModel - The form model to extract bindings from.
 * @param context - Pipeline context with form model metadata.
 * @returns An object with the extracted bindings (in P2 format) and the
 *          elementBindingMap for downstream use by P4.
 */
export function extractBindingModels(
	formModel: GenericModel,
	context: PipelineContext
): {
	readonly bindings: readonly P2BindingResult[];
	readonly p1Bindings: readonly P1BindingResult[];
	readonly elementBindingMap: ReadonlyMap<string, string>;
} {
	// Step 1: Parse bindingConfiguration annotation
	const annotations = getAnnotations(formModel);
	const bindingAnnotation = annotations.find((a) => a.name === "bindingConfiguration");

	if (!bindingAnnotation?.value) {
		return { bindings: [], p1Bindings: [], elementBindingMap: new Map() };
	}

	// Step 2: JSON.parse the annotation value
	let rawEntries: unknown;

	try {
		rawEntries = JSON.parse(bindingAnnotation.value);
	} catch {
		// Malformed annotation — skip silently
		return { bindings: [], p1Bindings: [], elementBindingMap: new Map() };
	}

	if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
		return { bindings: [], p1Bindings: [], elementBindingMap: new Map() };
	}

	// Steps 3-6: Validate, convert, and detect collisions
	const p1Results: Array<{ p1: P1BindingResult; bindingName: string }> = [];
	const seenBindingNames = new Set<string>();
	const usedElementIds = new Set<string>();

	for (const raw of rawEntries) {
		// Step 3: Validate with isUiConfigurationBinding
		if (!isUiConfigurationBinding(raw) || !isBindingModel(raw)) {
			continue;
		}

		// Step 4: Convert legacy binding.
		// Conversion errors intentionally propagate to fail-fast phase 1.
		const bindingModel = raw;
		const p1Result = convertLegacyBinding(bindingModel, context);

		// Step 5: Detect name collisions — deduplicate by appending elementId
		let bindingName = p1Result.bindingName;
		let ruModel = p1Result.ruModel;

		if (seenBindingNames.has(bindingName)) {
			bindingName = `${bindingName}-${p1Result.elementId}`;

			// Regenerate the model ID to reflect the disambiguated name
			const normalizedForId = bindingName.replace(/[\s_]+/g, "-");
			const newModelId = `${context.formModelId}-binding-${normalizedForId}_RuM`;

			ruModel = {
				...p1Result.ruModel,
				header: {
					...p1Result.ruModel.header,
					id: newModelId
				}
			};
		}

		seenBindingNames.add(bindingName);
		usedElementIds.add(p1Result.elementId);

		p1Results.push({ p1: { ...p1Result, ruModel, bindingName }, bindingName });
	}

	// Step 6: Build elementBindingMap and convert to P2 format
	const elementBindingMap = new Map<string, string>();
	const p1Bindings: P1BindingResult[] = [];
	const p2Bindings: P2BindingResult[] = [];

	for (const { p1, bindingName } of p1Results) {
		const p2 = toP2BindingResult(p1, bindingName);

		p1Bindings.push(p1);
		p2Bindings.push(p2);
		elementBindingMap.set(p1.elementId, p1.ruModel.header.id);
	}

	return { bindings: p2Bindings, p1Bindings, elementBindingMap };
}

/**
 * Converts a P1 BindingResult (from binding-converter) to the P2 BindingResult
 * format consumed by enrichment sub-steps (label-enricher, dropdown-upgrader,
 * query-regenerator).
 */
function toP2BindingResult(p1: P1BindingResult, bindingName: string): P2BindingResult {
	return {
		...p1,
		bindingName,
		relationshipUiModel: p1.ruModel,
		queryModels: [],
		migrations: {
			addButtonLabel: undefined,
			editButtonLabel: undefined,
			pageSizes: p1.pageSizeMigrations,
			rowActions: p1.rowActionMigrations,
			rowActivations: p1.rowActivationMigrations,
			pageSizeMigrations: p1.pageSizeMigrations,
			rowActionMigrations: p1.rowActionMigrations,
			rowActivationMigrations: p1.rowActivationMigrations,
			overviewLabelMigrations: p1.overviewLabelMigrations,
			modificationConfigFlags: {
				extendParentActivityDescriptor: false
			}
		},
		relationshipName: p1.ruModel.content.relationshipName,
		targetRole: p1.ruModel.content.targetRole,
		elementRef: undefined
	};
}
