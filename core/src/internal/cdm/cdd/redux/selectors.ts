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

/**
 * @packageDocumentation
 * @module cdm/cdd
 * @experimental
 */

import { type Models, isFormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import type {
	ModelGraph,
	Relationship as RelationshipServerApi
} from "@com.mgmtp.a12.dataservices/dataservices-access";
import {
	Model,
	Activity,
	type Selector,
	ModelSelectors,
	ReferencedModel,
	type ActivityMap,
	ActivitySelectors
} from "@com.mgmtp.a12.client/client-core";

import type { CdmData } from "../../cddUtils/cdmData.js";
import { assertObject } from "../../../shared/assertion.js";
import { collectMissingPaths } from "../core/impl/pending.js";
import type { QueryPath } from "../../cdmCommons/queryPath.js";
import { TARGET_GROUPNAME } from "../../cdmCommons/cddTechnical.js";
import type { Relationship } from "../../../relationship/relationship.js";
import { isSetDgCl } from "../../../documentGraph/redux/dhReducersImpl.js";
import { cddLinksWithMetadata } from "../core/adapter/toLinksWithMetadata.js";
import { isParentCdmActivity } from "../../dataProvider/subactivity/parent-activity.js";
import { filterCdmDataByRelevance } from "../../cddUtils/notRelevant/filterCdmDataByRelevance.js";
import { toEffectiveChanges, type EffectiveChangeList } from "../core/effectiveChanges/toEffectiveChanges.js";

import type { ScdmDataHolderShape } from "./dhReducersImpl.js";

export namespace CddSelectors {
	/**
	 * @internal
	 */
	export function effectiveChanges(activityId: string): Selector<EffectiveChangeList> {
		return (state) => {
			const emptyResult = {
				links: [],
				documents: []
			};

			const activity = ActivitySelectors.activityById(activityId)(state);

			if (!activity) {
				return emptyResult;
			}

			const defaultDataHolder = Activity.findDefaultDataHolder(activity);

			if (!defaultDataHolder || !isSetDgCl(defaultDataHolder.data)) {
				return emptyResult;
			}

			const documentModels = ModelSelectors.allModelsInScene(activityId)(state).filter(Model.isDocumentModel);
			const modelGraph = ModelSelectors.modelGraph()(state);
			const modelTuple = CddSelectors.selectModelTuple(state, activityId);

			if (!modelTuple) {
				return emptyResult;
			}

			const filteredCdmData = filterCdmDataByRelevance(
				defaultDataHolder.data as CdmData,
				modelTuple,
				documentModels,
				modelGraph
			);

			const { documentGraph, changeLog } = filteredCdmData;

			return toEffectiveChanges(documentGraph, changeLog);
		};
	}

	//#region ==== links ====

	export function links(
		activityId: string,
		relationshipModel: string,
		sourceDocId: string,
		targetRole: string
	): Selector<Relationship.LinkWithMutationMetadata[]> {
		return (state) => {
			const dataholder = dataHolderFromState(state, activityId);
			const changeLog = dataholder?.data?.changeLog;
			const dg = dataholder?.data?.documentGraph;

			return dg !== undefined && changeLog !== undefined
				? cddLinksWithMetadata(relationshipModel, sourceDocId, targetRole, dg, changeLog)
				: [];
		};
	}

	function dataHolderFromState(state: object, activityId: string): ScdmDataHolderShape | undefined {
		const activity = ActivitySelectors.activityById(activityId)(state);

		if (activity === undefined) {
			return undefined;
		}

		return Activity.findDefaultDataHolder(activity) as ScdmDataHolderShape;
	}

	//#endregion

	//#region ==== cdd ====

	export function cdd(activityId: string): Selector<DocumentWithState | undefined> {
		return (state) => {
			const foundDataHolder = dataHolderFromState(state, activityId);
			const dirty = foundDataHolder?.dirty;
			const document = foundDataHolder?.data?.cddState?.cachedCdd?.cdd;

			if (document !== undefined && dirty !== undefined) {
				return {
					document,
					loadingState: "loaded",
					dirty
				};
			} else {
				return undefined;
			}
		};
	}

	export interface DocumentWithState {
		readonly document: object;
		readonly loadingState: Activity.LoadingState;
		readonly dirty: boolean;
	}

	const cache = new Map();

	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	function memoize<F extends Function>(func: F): F {
		return function (this: any, ...args: any[]) {
			const key = args[0];

			if (cache.has(key)) {
				return cache.get(key);
			}

			const result = func.apply(this, args);
			cache.set(key, result);

			return result;
		} as any;
	}

	//#endregion

	//#region ==== missingPaths ====

	// exported for unit tests
	/** @internal */
	export const missingPathSelector = memoize(missingPaths);

	/** @internal */
	export function missingPaths(activityId: string): Selector<QueryPath[]> {
		return (state) => {
			const foundDataHolder = dataHolderFromState(state, activityId);
			const cddState = foundDataHolder?.data?.cddState;

			if (cddState === undefined) {
				// cddState not present (yet) -> create missing path for root doc (id derived from Activity descriptor)
				const activity = ActivitySelectors.activityById(activityId)(state);

				if (activity?.descriptor.instance) {
					return collectMissingPaths(activity?.descriptor.instance);
				} else {
					throw new Error("activity.descriptor.instance expected for CDM");
				}
			} else {
				return collectMissingPaths(cddState);
			}
		};
	}

	//#endregion

	/** @internal */
	export function cddCandidates(
		activityId: string,
		usage: string
	): Selector<RelationshipServerApi.Candidate[] | undefined> {
		return (state) => {
			const candidates = candidatesSelector(activityId, usage)(state);

			if (!candidates) {
				return undefined;
			}

			const defaultDataHolder = dataHolderFromState(state, activityId) as ScdmDataHolderShape;
			const dg = defaultDataHolder?.data?.documentGraph;
			assertObject(dg, "Document graph is missing");

			const updatedCandidates = candidates?.map((candidate) => {
				const targetDocRef = candidate.linkRef.linkDescriptor.entities[1].docRef;
				const dgDocument = targetDocRef ? dg.documents.byDocRef[targetDocRef] : undefined;

				if (dgDocument && dgDocument.loadingState === "loaded") {
					return {
						...candidate,
						document: {
							...candidate.document,
							[TARGET_GROUPNAME]: dgDocument.document
						}
					};
				}

				return candidate;
			});

			return updatedCandidates;
		};
	}

	function candidatesSelector(
		activityId: string,
		usage: string
	): Selector<RelationshipServerApi.Candidate[] | undefined> {
		return (state) => {
			const activity = ActivitySelectors.activityById(activityId)(state);

			if (activity === undefined) {
				return undefined;
			}

			const { dataHolders = [] } = activity;
			const candidateDh = dataHolders.find((dh) => isCandidateDataHolderForInstance(dh, usage));

			if (candidateDh) {
				return (candidateDh as Activity.DataHolder<{ candidates: RelationshipServerApi.Candidate[] }>).data?.candidates;
			}

			return undefined;
		};
	}

	function isCandidateDataHolderForInstance(
		dataHolder: Activity.DataHolder<unknown>,
		usage: string
	): dataHolder is Activity.DataHolder<{ candidates: RelationshipServerApi.Candidate[] }> {
		return (
			dataHolder.descriptor.feature === "relationship" &&
			dataHolder.descriptor.type === "candidate" &&
			dataHolder.descriptor.instanceId === usage
		);
	}

	/**
	 * An activity will use CDD functionality if it:
	 * - has an instance set in its descriptor
	 * - contains a form model that references a cdm OR
	 * - has a parent that uses CDD functionality
	 */
	export function isCddActivity(state: object, activityId: string): boolean {
		const activities = ActivitySelectors.activities()(state);

		const maybeCdmName = cdmName(state, activityId);

		return isCddActivityInternal(activities, activityId, maybeCdmName);
	}

	/**
	 * @internal
	 */
	export function isCddActivityInternal(activities: ActivityMap, activityId: string, cdmName?: string): boolean {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const activity = activities[activityId]!;
		const initiatingActivity = activities[activity?.initiatingActivityId ?? ""];

		return (
			activity?.descriptor.instance !== undefined && (cdmName !== undefined || isParentCdmActivity(initiatingActivity))
		);
	}

	/**
	 * For a given `activityId`, checks its referenced models.
	 *
	 * 1. there should only exist one form in the descriptors, if at all
	 * 2. find the referenced document model of the form via model graph
	 * 3. look for it in the composed models
	 *
	 * Only returns the name of the referenced document model if its a CDM.
	 *
	 * @internal
	 */
	export function cdmName(state: object, activityId: string): string | undefined {
		const modelGraph = ModelSelectors.modelGraph()(state);
		const modelsInScene = ModelSelectors.referencedModelsInScene(activityId)(state);

		return cdmNameInternal(modelGraph, modelsInScene);
	}

	/**
	 * @internal
	 */
	export function cdmNameInternal(
		modelGraph: ModelGraph,
		modelsInScene: ReferencedModel.Instance[]
	): string | undefined {
		const { composeDocumentModels } = modelGraph;

		const dmName = findReferencedDMName(modelGraph, modelsInScene);

		const referencesCDM = composeDocumentModels?.some((cdm) => cdm.modelId === dmName);

		return referencesCDM ? dmName : undefined;
	}

	function findReferencedDMName(modelGraph: ModelGraph, modelsInScene: ReferencedModel.Instance[]): string | undefined {
		const { genericModels } = modelGraph;

		const fm = modelsInScene?.find(
			(r) =>
				r.direct &&
				(ReferencedModel.isLoaded(r)
					? r.model.header.modelType
					: ReferencedModel.isNotLoaded(r)
						? r.model.modelType
						: undefined) === "form"
		);

		const fmName = ReferencedModel.isLoaded(fm)
			? fm.model.header.id
			: ReferencedModel.isNotLoaded(fm)
				? fm.model.name
				: undefined;

		if (!fmName) {
			return undefined;
		}

		const form = genericModels?.find((m) => m.modelId === fmName);

		return form?.modelReferences?.find((ref) => ref.modelType === "document")?.reference;
	}

	/**
	 * @internal
	 */
	export function selectModelTuple(state: object, activityId: string): Models | undefined {
		const modelDescriptors = ModelSelectors.modelDescriptorsByActivityId(activityId)(state);

		const formModelName = modelDescriptors.find((md) => md.modelType === "form")?.name;

		if (!formModelName) {
			return undefined;
		}

		const formModel = ModelSelectors.modelByName(formModelName, isFormModel)(state);

		if (!formModel) {
			return undefined;
		}

		const documentModelName = formModel.header.modelReferences?.find((ref) => ref.modelType === "document")?.reference;

		if (!documentModelName) {
			return undefined;
		}

		const documentModel = ModelSelectors.modelByName(documentModelName, Model.isDocumentModel)(state);

		if (!documentModel) {
			return undefined;
		}

		return { documentModel, formModel };
	}
}
