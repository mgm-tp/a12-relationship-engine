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

import type { ReferencedModel } from "@com.mgmtp.a12.client/client-core";
import type { ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";

import type { Changelog, DocumentGraph } from "../state.js";

import { applyDocAdded } from "./changes/applyDocAdded.js";
import { applyLinkAdded } from "./changes/applyLinkAdded.js";
import { applyDocChanged } from "./changes/applyDocChanged.js";
import { applyLinkDeleted } from "./changes/applyLinkDeleted.js";
import { applyLinkDocChanged } from "./changes/applyLinkDocChanged.js";
import { applyCdmRootComputed } from "./changes/applyCdmRootComputed.js";
import { applySubDocumentGraphAdded } from "./changes/applySubDocumentGraphAdded.js";

export function applyChange(
	documentGraph: DocumentGraph,
	change: Changelog.Change,
	modelsInScene: ReferencedModel.Instance[],
	modelGraph?: ModelGraph
): DocumentGraph {
	const next = dispatch(documentGraph, change, modelsInScene, modelGraph);

	// Bump index for all change kinds (including ephemeral ones like cdmRootComputed/subDocumentGraphAdded)
	// to maintain a monotonic ordering across the full changelog sequence.
	return { ...next, changelogIndex: next.changelogIndex + 1 };
}

function dispatch(
	documentGraph: DocumentGraph,
	change: Changelog.Change,
	modelsInScene: ReferencedModel.Instance[],
	modelGraph: ModelGraph | undefined
): DocumentGraph {
	switch (change.kind) {
		case "docAdded":
			return applyDocAdded(documentGraph, change);
		case "docChanged":
			return applyDocChanged(documentGraph, change, modelsInScene);
		case "linkAdded":
			return applyLinkAdded(documentGraph, change, modelsInScene, modelGraph);
		case "linkDeleted":
			return applyLinkDeleted(documentGraph, change);
		case "linkDocChanged":
			return applyLinkDocChanged(documentGraph, change, modelsInScene, modelGraph);
		case "cdmRootComputed":
			return applyCdmRootComputed(documentGraph, change);
		case "subDocumentGraphAdded":
			return applySubDocumentGraphAdded(documentGraph, change);
		default:
			throw new Error(`Unknown change type: ${(change as { kind: string }).kind}`);
	}
}
