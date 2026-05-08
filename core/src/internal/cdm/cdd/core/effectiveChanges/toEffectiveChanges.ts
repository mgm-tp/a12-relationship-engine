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
import { type DocumentGraph } from "../../../../documentGraph/core/documentGraph.js";
import { type DgChangeLog } from "../../../../documentGraph/core/slices.js";
import { type DeepReadonly } from "../../../../documentGraph/core/utilityTypes.js";

import { documentsWithMetaData, type DocumentWithMutationMetadata } from "./documentsWithMetaData.js";
import { linksWithMetaData, type LinkWithMutationMetadataAndTime } from "./linksWithMetaData.js";

/**
 * @internal
 * Contains all effective changes of links and documents from the change log
 */
export interface EffectiveChangeList {
	readonly links: LinkWithMutationMetadataAndTime[];
	readonly documents: DocumentWithMutationMetadata[];
}

/**
 * @internal
 * Returns all effective link and document changes of the changelog
 */
export function toEffectiveChanges(
	documentGraph: DeepReadonly<DocumentGraph>,
	changeLog: DgChangeLog
): EffectiveChangeList {
	return {
		links: linksWithMetaData(documentGraph, changeLog),
		documents: documentsWithMetaData(documentGraph, changeLog)
	};
}
