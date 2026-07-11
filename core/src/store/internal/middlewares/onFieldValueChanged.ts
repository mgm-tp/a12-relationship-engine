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

import { Events, DocumentPath, FormEngineActions } from "@com.mgmtp.a12.formengine/formengine-core";

import { LinkSelectors } from "../selectors/link.js";
import { ModelSelectors } from "../selectors/model.js";
import { RelationshipEngineActions } from "../actions.js";
import { ChangelogSelectors } from "../selectors/changelog.js";
import { DocumentGraphSelectors } from "../selectors/documentGraph.js";

export const onFieldValueChangedMiddleware: Middleware = (store) => (next) => (action) => {
	const result = next(action);

	if (!FormEngineActions.event.match(action) || !Events.valueChange.match(action.payload.engineEvent)) {
		return result;
	}

	const { activityId, engineEvent } = action.payload;
	const state = store.getState();

	if (!ChangelogSelectors.changelog(activityId)(state)) {
		return result;
	}

	const { path, value } = engineEvent.payload;

	const docRefResult = DocumentGraphSelectors.docRef(activityId, path)(state);

	if (!docRefResult) {
		return result;
	}

	const { docRef, documentModelName, targetInstancePath } = docRefResult;
	const targetPath = DocumentPath.fromString(targetInstancePath);
	const linkContext = docRef ? LinkSelectors.findByDocRef(activityId, docRef)(state) : undefined;

	if (linkContext) {
		store.dispatch(
			RelationshipEngineActions.Commands.addChangeLog({
				activityId,
				change: {
					kind: "linkDocChanged",
					linkId: linkContext.linkId,
					linkRef: linkContext.linkRef,
					documentModelName,
					path: targetPath,
					value
				}
			})
		);

		if (ModelSelectors.isCdmActivity(activityId)(state)) {
			store.dispatch(RelationshipEngineActions.Events.scdmComputation.started({ activityId }));
		}

		return result;
	}

	store.dispatch(
		RelationshipEngineActions.Commands.addChangeLog({
			activityId,
			change: {
				kind: "docChanged",
				docRef,
				documentModelName,
				path: targetPath,
				value
			}
		})
	);

	if (ModelSelectors.isCdmActivity(activityId)(state)) {
		store.dispatch(RelationshipEngineActions.Events.scdmComputation.started({ activityId }));
	}

	return result;
};
