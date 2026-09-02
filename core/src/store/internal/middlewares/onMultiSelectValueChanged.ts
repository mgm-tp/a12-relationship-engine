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

import type { Middleware } from "redux";

import { Events, FormActivity, DocumentPath, FormEngineActions } from "@com.mgmtp.a12.formengine/formengine-core";
import { Model, ActivitySelectors, ModelSelectors as ClientModelSelectors } from "@com.mgmtp.a12.client/client-core";

import { LinkSelectors } from "../selectors/link.js";
import { RelationshipEngineActions } from "../actions.js";
import { DocumentUtils } from "../utils/documentUtils.js";
import { ChangelogSelectors } from "../selectors/changelog.js";
import { DocumentGraphSelectors } from "../selectors/documentGraph.js";

import { dispatchScdmIfCdm } from "./changeHelpers.js";

/** @internal Middleware that records multi-select value changes into the changelog as whole-document replacements. */
export const onMultiSelectValueChangedMiddleware: Middleware = (store) => (next) => (action) => {
	const result = next(action);

	if (!FormEngineActions.event.match(action) || !Events.multiSelectValueChange.match(action.payload.engineEvent)) {
		return result;
	}

	const { activityId, engineEvent } = action.payload;
	const state = store.getState();

	if (!ChangelogSelectors.changelog(activityId)(state)) {
		return result;
	}

	const { path, value } = engineEvent.payload;

	const docRefResult = DocumentGraphSelectors.docRef(activityId, path)(state);

	if (!docRefResult || !docRefResult.docRef) {
		return result;
	}

	const { docRef, documentModelName, targetInstancePath } = docRefResult;
	const targetPath = DocumentPath.fromString(targetInstancePath);

	const currentDoc = resolveCurrentDocument(activityId, docRef, state);

	if (!currentDoc) {
		return result;
	}

	const documentModel = ClientModelSelectors.modelByName(documentModelName, Model.isDocumentModel)(state);

	if (documentModel === undefined) {
		return result;
	}

	const updatedDoc = DocumentUtils.setGroupInstances(currentDoc, targetPath, value, documentModel);
	const linkContext = LinkSelectors.findByDocRef(activityId, docRef)(state);

	if (linkContext) {
		store.dispatch(
			RelationshipEngineActions.Commands.addChangeLog({
				activityId,
				change: {
					kind: "linkDocChanged",
					linkId: linkContext.linkId,
					linkRef: linkContext.linkRef,
					documentModelName,
					linkDocument: updatedDoc
				}
			})
		);
	} else {
		store.dispatch(
			RelationshipEngineActions.Commands.addChangeLog({
				activityId,
				change: {
					kind: "docChanged",
					docRef,
					documentModelName,
					document: updatedDoc
				}
			})
		);
	}

	dispatchScdmIfCdm(activityId, state, store);

	return result;
};

/**
 * `DocumentGraphSelectors.documentByRef` only resolves documents backed by a DocumentGraph data
 * holder (CDM activities); standalone (non-CDM) document activities keep their current document
 * on the default data holder instead.
 */
function resolveCurrentDocument(activityId: string, docRef: string, state: object): object | undefined {
	const documentFromGraph = DocumentGraphSelectors.documentByRef(activityId, docRef)(state);

	if (documentFromGraph) {
		return documentFromGraph;
	}

	const activityData = ActivitySelectors.data(activityId)(state);

	return FormActivity.Data.SingleDocumentData.isInstance(activityData) ? activityData.document : undefined;
}
