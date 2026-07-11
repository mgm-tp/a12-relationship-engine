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
 * @module cdm/cdmCommons
 * @experimental
 */

import type { GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import { A12InternalConstants } from "../../shared/constants.js";
import type { DeepReadonly } from "../../documentGraph/core/utilityTypes.js";
import type { DocumentGraph } from "../../documentGraph/core/documentGraph.js";

export const T_DOC_REF = "t_docRef";
export const TARGET_GROUPNAME = A12InternalConstants.TARGET_GROUP_NAME;
export const LINKDOC_GROUPNAME = A12InternalConstants.RELATIONSHIP_GROUP_NAME;
export const LINK_ID = "meta-link-id";

/**
 * Constant identifier for the first, always existing dgDocument of the dg
 * that holds all values that belong to the CDM (and not specific documents)
 */
export const CDD_DOC_REF = "cddDocument/0";

export function getCddDoc(dg: DeepReadonly<DocumentGraph>): GroupInstance {
	const cddDoc = dg.documents.byDocRef[CDD_DOC_REF];

	// will always exist as "loaded"
	return cddDoc.loadingState === "loaded" ? cddDoc.document : {};
}
