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

import { put, call, select, type SagaGenerator } from "typed-redux-saga";

import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import type { DataProvider } from "@com.mgmtp.a12.client/client-core";

import type { SaveProviderHandler } from "../types.js";
import { ChangelogSelectors } from "../../../../store/index.js";
import {
	type RequestSelectorMap as RERequestSelectorMap,
	DefaultRequestSelectorMap as REDefaultRequestSelectorMap
} from "../../requestSelectorMap.js";

import type { SaveState } from "./types.js";
import { finalizeSave } from "./finalizeSave.js";
import { handleMergeSave } from "./handleMergeSave.js";
import { handlePersistSave } from "./handlePersistSave.js";
import { promptLinkDocumentForm } from "./promptLinkDocumentForm.js";
import { collectMissingLinkDocuments } from "./collectMissingLinkDocuments.js";

/**
 * Handler for save operations in the Relationship Engine.
 *
 * Handles three save scenarios:
 * - **noop**: No changes – signals save complete immediately.
 * - **merge**: Child changelog is merged into the parent's changelog.
 * - **persist**: Changes are persisted to the server via RPC requests.
 *
 * After persisting, the handler dispatches `ActivityActions.reloadData`
 * to trigger a fresh load cycle for the affected activities.
 */
export class SaveHandler implements SaveProviderHandler {
	readonly name = "SaveHandler";
	private readonly requestSelectorMap: RERequestSelectorMap;

	constructor(requestSelectorMap?: RERequestSelectorMap) {
		this.requestSelectorMap = requestSelectorMap ?? REDefaultRequestSelectorMap;
	}

	*handle(params: DataProvider.SaveConfig): SagaGenerator<void> {
		// Pre-step: prompt for any inherited linkAdded entries that are missing a link document.
		// This runs before save routing so the changelog is fully patched before we persist/merge.
		const missing = yield* call(collectMissingLinkDocuments, params.activityId);

		if (missing.length > 0) {
			const outcome = yield* call(promptLinkDocumentForm, params.activityId, missing);

			if (outcome === "cancelled") {
				// User cancelled the link doc dialog — abort the save. dirty stays true.
				yield* put(params.details.saving.failed({}));

				return;
			}
		}

		const saveState = yield* call(resolveSaveState, params.activityId);

		if (saveState.kind === "noop") {
			yield* call(finalizeSave, params, saveState.activityId);

			return;
		}

		if (saveState.kind === "merge") {
			yield* call(handleMergeSave, params, saveState);

			return;
		}

		yield* call(handlePersistSave, params, saveState, this.requestSelectorMap);
	}
}

/**
 * Creates a new SaveHandler instance.
 */
export function createSaveHandler(requestSelectorMap?: RERequestSelectorMap): SaveHandler {
	return new SaveHandler(requestSelectorMap);
}

function* resolveSaveState(activityId: string): SagaGenerator<SaveState> {
	const activity = yield* select(ActivitySelectors.activityById(activityId));
	const parentActivityId = activity?.initiatingActivityId;

	if (parentActivityId) {
		const parentChangelog = yield* select(ChangelogSelectors.changelog(parentActivityId));

		if (parentChangelog) {
			const changes = yield* select(ChangelogSelectors.mergeableChanges(activityId));

			return { kind: "merge", activityId, parentActivityId, changes: changes ?? [] };
		}
	}

	const changelog = yield* select(ChangelogSelectors.changelog(activityId));
	const effectiveChanges = yield* select(ChangelogSelectors.effectiveChanges(activityId));

	if (!changelog || !effectiveChanges || effectiveChanges.length === 0) {
		return { kind: "noop", activityId };
	}

	return { kind: "persist", activityId, effectiveChanges, changelog, parentActivityId };
}
