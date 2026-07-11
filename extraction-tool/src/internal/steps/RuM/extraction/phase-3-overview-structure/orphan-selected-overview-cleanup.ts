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

import type { WorkspaceModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { OverviewModel } from "../../../../../models/overview-model.js";
import { isOverviewModel, isLegacyGeneratedDocumentModel } from "../model-accessors/type-guards.js";
import type { LegacyGeneratedDocumentModel } from "../../../../../models/legacy-generated-document-model.js";

import type { OverviewStructureFinalRuM } from "./types.js";
import { analyzeGeneratedDocumentModel } from "./generated-doc-analyzer.js";
import { findGeneratedDocModelId } from "./generated-doc-overview-helpers.js";
import { forEachRelationshipBinding } from "./binding-configuration-scanner.js";

interface OrphanSelectedOverviewCleanupContext {
	readonly finalRuMs: readonly OverviewStructureFinalRuM[];
	readonly keepModels: boolean;
	readonly resolveModel: (modelId: string) => object | undefined;
	readonly workspaceModels?: readonly WorkspaceModel[];
}

/**
 * Collects deletion candidate IDs for orphaned selected-items overview pairs during non-keep-model extraction.
 * Returns the overview ID together with its generated document model ID only when the overview is inactive,
 * matches the selected-overview shape, and neither model is still referenced elsewhere in the workspace.
 */
export function collectOrphanSelectedOverviewDeletionIds(
	context: OrphanSelectedOverviewCleanupContext
): readonly string[] {
	if (context.keepModels || context.workspaceModels === undefined) {
		return [];
	}

	const activeSelectedOverviewIds = collectActiveSelectedOverviewIds(context.finalRuMs, context.workspaceModels);
	const deletionIds = new Set<string>();

	for (const workspaceModel of context.workspaceModels) {
		const candidateId = workspaceModel.header.id;

		if (activeSelectedOverviewIds.has(candidateId)) {
			continue;
		}

		const candidateModel = context.resolveModel(candidateId);

		if (candidateModel === undefined || !isOverviewModel(candidateModel)) {
			continue;
		}

		const generatedDocId = findGeneratedDocModelId(candidateModel);

		if (generatedDocId === undefined) {
			continue;
		}

		const generatedDocModel = context.resolveModel(generatedDocId);

		if (generatedDocModel === undefined || !isLegacyGeneratedDocumentModel(generatedDocModel)) {
			continue;
		}

		if (!hasSelectedOverviewShape(candidateModel, generatedDocModel)) {
			continue;
		}

		if (
			hasExactWorkspaceReference(context.workspaceModels, context.resolveModel, candidateId, new Set([candidateId]))
		) {
			continue;
		}

		if (
			hasExactWorkspaceReference(
				context.workspaceModels,
				context.resolveModel,
				generatedDocId,
				new Set([candidateId, generatedDocId])
			)
		) {
			continue;
		}

		deletionIds.add(candidateId);
		deletionIds.add(generatedDocId);
	}

	return [...deletionIds];
}

function collectActiveSelectedOverviewIds(
	finalRuMs: readonly OverviewStructureFinalRuM[],
	workspaceModels: readonly WorkspaceModel[]
): ReadonlySet<string> {
	const activeIds = new Set<string>();
	const workspaceModelTypeById = new Map(
		workspaceModels.map((workspaceModel) => [workspaceModel.header.id, workspaceModel.header.modelType])
	);

	for (const finalRuM of finalRuMs) {
		const component = finalRuM.rumModel.content.component;

		if (component.selectedItemsOverviewModel !== undefined && component.selectedItemsOverviewModel.length > 0) {
			activeIds.add(component.selectedItemsOverviewModel);
		}

		const editSelectedOverviewId = component.editConfiguration?.selectedItemsOverviewModel;

		if (typeof editSelectedOverviewId === "string" && editSelectedOverviewId.length > 0) {
			activeIds.add(editSelectedOverviewId);
		}
	}

	forEachRelationshipBinding(workspaceModels, (binding) => {
		for (const component of binding.components) {
			for (const model of component.models ?? []) {
				if (model.use !== "link") {
					continue;
				}

				if (workspaceModelTypeById.get(model.name) === "overview") {
					activeIds.add(model.name);
				}
			}
		}
	});

	return activeIds;
}

function hasSelectedOverviewShape(overview: OverviewModel, generatedDocModel: LegacyGeneratedDocumentModel): boolean {
	const analysis = analyzeGeneratedDocumentModel(generatedDocModel);
	const referenceColumns = (overview.content.columns ?? []).filter((column) =>
		OverviewModel.ReferenceColumn.isAssignableFrom(column)
	);

	if (
		analysis.targetDocumentModelId.length === 0 ||
		analysis.targetGroupPrefix.length === 0 ||
		referenceColumns.length === 0
	) {
		return false;
	}

	if (analysis.relationshipGroupPrefix !== undefined) {
		const relationshipGroupPrefix = analysis.relationshipGroupPrefix;

		return referenceColumns.some(
			(column) =>
				column.elementRef.startsWith(analysis.targetGroupPrefix) ||
				column.elementRef.startsWith(relationshipGroupPrefix)
		);
	}

	return (
		looksLikeSelectedLinkOverview(overview.header.id) &&
		referenceColumns.every((column) => column.elementRef.startsWith(analysis.targetGroupPrefix))
	);
}

function looksLikeSelectedLinkOverview(overviewId: string): boolean {
	return overviewId.includes("LinkOverview");
}

function hasExactWorkspaceReference(
	workspaceModels: readonly WorkspaceModel[],
	resolveModel: (modelId: string) => object | undefined,
	targetId: string,
	ignoredModelIds: ReadonlySet<string>
): boolean {
	for (const workspaceModel of workspaceModels) {
		if (ignoredModelIds.has(workspaceModel.header.id)) {
			continue;
		}

		const resolvedModel = resolveModel(workspaceModel.header.id);

		if (resolvedModel !== undefined && jsonTreeContainsExactString(resolvedModel, targetId)) {
			return true;
		}
	}

	return false;
}

function jsonTreeContainsExactString(value: unknown, targetId: string): boolean {
	if (typeof value === "string") {
		return value === targetId;
	}

	if (Array.isArray(value)) {
		return value.some((entry) => jsonTreeContainsExactString(entry, targetId));
	}

	if (isRecord(value)) {
		return Object.values(value).some((entry) => jsonTreeContainsExactString(entry, targetId));
	}

	return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
