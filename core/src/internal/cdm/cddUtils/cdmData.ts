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

import { type DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { createDG, type DgChangeLogSlice, type DgSlice } from "../../documentGraph/core/index.js";
import * as DocOps from "../../documentGraph/core/impl/docs.js";
import { addDocument } from "../../documentGraph/core/reducers.js";

import { toCdd } from "../cdd/core/adapter/toCdd.js";
import { type CddState } from "../cdd/core/cddState.js";
import { newCddState } from "../cdd/core/impl/cddStateImpl.js";
import { CDD_DOC_REF } from "../cdmCommons/cddTechnical.js";

/**
 * Data structure for the data of a cdm activity consisting of the document graph,
 * the changelog and the cdd state
 *
 * @experimental
 * @internal
 */
export type CdmData = DgSlice & DgChangeLogSlice & { cddState: CddState };

/**
 * Creates empty CdmData.
 *
 * This has a dg containing the 'cddDocument' and an empty root document, a
 * change log containing only the changes for adding the initial documents and a
 * cddState based on the initial dg.
 *
 * @internal
 */
export function createEmptyCdmData(
	cdm: DocumentModel,
	rootDocumentModelName: string,
	rootDocumentReference: string
): CdmData {
	// initialize empty dg and add the always present cdd document
	const [initialDg] = DocOps.addDocument({}, CDD_DOC_REF, cdm.header.id, createDG());

	// add empty initial root doc to initial dg
	const { documentGraph, changeLog } = addDocument(
		{
			documentGraph: initialDg,
			changeLog: { changes: [], changeCounter: 0 }
		},
		{
			document: {},
			documentModelName: rootDocumentModelName,
			elementRef: rootDocumentReference
		}
	);

	const cddState: CddState = {
		...newCddState(rootDocumentReference, cdm),
		cachedCdd: {
			cdd: toCdd(documentGraph, rootDocumentReference, cdm.content.modelRoot)
		}
	};

	return {
		documentGraph,
		changeLog,
		cddState
	};
}
