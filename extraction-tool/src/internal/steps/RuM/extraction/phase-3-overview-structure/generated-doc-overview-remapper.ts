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

import { ModelNotFoundError } from "../model-not-found-error.js";
import { OverviewModel } from "../../../../../models/overview-model.js";
import { getModelReferences } from "../model-accessors/header-accessors.js";
import { isLegacyGeneratedDocumentModel } from "../model-accessors/type-guards.js";
import type { LegacyGeneratedDocumentModel } from "../../../../../models/legacy-generated-document-model.js";

import { addLinkReferences } from "./link-reference-builder.js";
import type { RemapOverviewParams, RemapOverviewResult } from "./types.js";
import { analyzeGeneratedDocumentModel } from "./generated-doc-analyzer.js";
import { classifyColumn, isGeneratedWrapperElementRef } from "./column-classifier.js";
import { processAllColumns, replaceDocumentModelForOverviewRef } from "./column-remapper.js";
import { replaceDocumentModelForOverviewRefWithQueryRef } from "./generated-doc-overview-helpers.js";
import {
	reconcileSubHeaderSlots,
	stripInteractiveAffordances,
	normalizeFilterConfiguration
} from "./interactive-stripper.js";
import {
	resolveSourceContextFromRelationship,
	resolveTargetDocumentModelIdFromRelationship
} from "./relationship-content-resolver.js";

/** Remaps an overview model backed by a generated document wrapper stub into its final column and ref form. */
export function remapOverviewWithGeneratedDoc(params: RemapOverviewParams): RemapOverviewResult {
	const {
		overview,
		overviewId,
		genDocId,
		overviewContext,
		firstContext,
		resolveModel,
		keepModels,
		sourceDocumentModelId
	} = params;

	// Step 1: Resolve generated document model
	const resolvedGenDoc = resolveModel(genDocId);

	if (resolvedGenDoc === undefined || !isLegacyGeneratedDocumentModel(resolvedGenDoc)) {
		throw new ModelNotFoundError(genDocId);
	}

	const genDoc = resolvedGenDoc;

	// Step 2: Analyze generated document model
	const generatedDocAnalysis = analyzeGeneratedDocumentModel(genDoc);

	// Step 3: Inline-field pattern fallback — generated doc has no includeConfig reference
	// (e.g., CategoryCategory_ChildCategory____generated). Fall back to the relationship
	// model's entity characteristics for the target role.
	let effectiveGenDocAnalysis = generatedDocAnalysis;

	if (generatedDocAnalysis.targetDocumentModelId.length === 0 && firstContext !== undefined) {
		const fallbackTargetDocModelId = resolveTargetDocumentModelIdFromRelationship(
			resolveModel,
			firstContext.relationshipName,
			firstContext.targetRole
		);

		if (fallbackTargetDocModelId !== undefined) {
			effectiveGenDocAnalysis = {
				...generatedDocAnalysis,
				targetDocumentModelId: fallbackTargetDocModelId
			};
		}
	}

	if (effectiveGenDocAnalysis.targetDocumentModelId.length === 0) {
		throw new ModelNotFoundError(overviewId);
	}

	const currentAnalysis = effectiveGenDocAnalysis;

	// Step 4: Process columns — classify and remap elementRefs
	const overviewColumns = overview.content.columns.filter((column): column is OverviewModel.ReferenceColumn =>
		OverviewModel.ReferenceColumn.isAssignableFrom(column)
	);

	const { remappedColumns } = processAllColumns(
		overviewColumns,
		currentAnalysis.targetGroupPrefix,
		currentAnalysis.relationshipGroupPrefix ?? ""
	);

	// Classify each source column for link reference generation
	const elementClassifications = overviewColumns.map((col) =>
		classifyColumn(col.elementRef, currentAnalysis.targetGroupPrefix, currentAnalysis.relationshipGroupPrefix ?? "")
	);

	// Step 5: Prune stale generated-wrapper refs (e.g., G2_field_*).
	// These are not valid runtime field refs after generated-doc flattening.
	const remappedColumnEntries: Array<{
		readonly column: (typeof remappedColumns)[number];
		readonly classification: (typeof elementClassifications)[number];
	}> = [];

	for (let index = 0; index < remappedColumns.length; index += 1) {
		if (isGeneratedWrapperElementRef(remappedColumns[index]?.elementRef)) {
			continue;
		}

		remappedColumnEntries.push({
			column: remappedColumns[index],
			classification: elementClassifications[index]
		});
	}

	const prunedColumns = remappedColumnEntries.map((entry) => entry.column);
	const prunedClassifications = remappedColumnEntries.map((entry) => entry.classification);

	// Step 6: Replace document model reference
	const overviewRefs = getModelReferences(overview);
	const shouldUseBaseQueryRef =
		!keepModels &&
		overviewContext?.isLinkOverview === true &&
		currentAnalysis.targetDocumentModelId.length > 0 &&
		sourceDocumentModelId !== undefined;
	const updatedRefs = shouldUseBaseQueryRef
		? replaceDocumentModelForOverviewRefWithQueryRef(overviewRefs, `${overviewId}-query`)
		: replaceDocumentModelForOverviewRef(overviewRefs, currentAnalysis.targetDocumentModelId);

	// Build updated overview model with remapped columns and updated refs
	const remappedOverview: OverviewModel = {
		...overview,
		header: {
			...overview.header,
			modelReferences: [...updatedRefs]
		},
		content: {
			...overview.content,
			columns: [...prunedColumns]
		}
	};

	// Pass the generated stub as linkDocModel so addLinkReferences can follow its includeConfig.reference wrappers via resolveModel.
	const linkDocModel: LegacyGeneratedDocumentModel | undefined =
		currentAnalysis.linkDocumentModelId !== undefined ? genDoc : undefined;

	// Step 7: Add per-column link references.
	const overviewLinkSourceContext =
		overviewContext !== undefined
			? resolveSourceContextFromRelationship(resolveModel, overviewContext.relationshipName, overviewContext.targetRole)
			: undefined;
	const linkTargetRole: string =
		overviewContext !== undefined
			? overviewContext.duplicatesAllowed
				? overviewContext.targetRole // exclude mode: items role
				: (overviewLinkSourceContext?.sourceRole ?? overviewContext.targetRole) // HAS mode: source/form role
			: "";

	const columnsWithLinkRefs =
		overviewContext !== undefined
			? addLinkReferences(
					prunedColumns,
					prunedClassifications,
					linkDocModel,
					overviewContext.duplicatesAllowed,
					overviewContext.relationshipName,
					overviewContext.targetRole,
					linkTargetRole,
					resolveModel
				)
			: prunedColumns;

	// Step 8: Strip interactive affordances (when duplicatesAllowed=true)
	let strippedColumns = columnsWithLinkRefs;
	let strippedSubHeaderBox = overview.content.subHeaderBox;
	let strippedFooterBox = overview.content.footerBox;
	let strippedConfiguration: OverviewModel.Configuration = overview.content.configuration;

	if (overviewContext?.duplicatesAllowed === true) {
		const stripped = stripInteractiveAffordances(
			strippedColumns,
			strippedSubHeaderBox,
			strippedFooterBox,
			overview.content.configuration
		);

		strippedColumns = stripped.columns;
		strippedSubHeaderBox = stripped.subHeaderBox;
		strippedFooterBox = stripped.footerBox;
		strippedConfiguration = stripped.configuration ?? strippedConfiguration;
	}

	const reconciledSubHeaderBox = reconcileSubHeaderSlots(strippedSubHeaderBox, strippedConfiguration);

	if (reconciledSubHeaderBox !== strippedSubHeaderBox) {
		strippedSubHeaderBox = reconciledSubHeaderBox;
	}

	strippedConfiguration = normalizeFilterConfiguration(strippedConfiguration);

	// Build final overview with all updates applied
	const finalContent: OverviewModel["content"] = {
		...overview.content,
		columns: [...strippedColumns],
		configuration: strippedConfiguration,
		...(strippedSubHeaderBox !== undefined ? { subHeaderBox: strippedSubHeaderBox } : {}),
		...(strippedFooterBox !== undefined ? { footerBox: strippedFooterBox } : {})
	};

	const finalOverview: OverviewModel = {
		...remappedOverview,
		content: finalContent
	};

	return {
		finalOverview,
		analysis: effectiveGenDocAnalysis,
		analyzedGenDocId: genDocId
	};
}
