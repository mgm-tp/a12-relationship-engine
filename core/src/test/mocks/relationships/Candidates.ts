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

import { type Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { documentByType } from "./documents/index.js";

export function createInstanceCandidates(params: {
	relationshipModelName: string;
	sourceEntity: Relationship.LinkEntitySpec;
	targetRole: string;
}): Relationship.Candidate[] {
	const { relationshipModelName, sourceEntity, targetRole } = params;

	return createCandidates({
		relationshipModelName,
		sourceEntity,
		targetRole,
		targetDocuments: documentByType[targetRole] || []
	});
}

function createCandidates(params: {
	relationshipModelName: string;
	sourceEntity: Relationship.LinkEntitySpec;
	targetRole: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	targetDocuments: { [key: string]: any }[];
}): Relationship.Candidate[] {
	const { relationshipModelName, sourceEntity, targetRole, targetDocuments } = params;
	return targetDocuments.map<Relationship.Candidate>((document, documentIndex) => ({
		linkRef: {
			linkDescriptor: {
				relationshipModel: relationshipModelName,
				entities: [
					{
						...sourceEntity,
						modelName: ""
					},
					{
						role: targetRole,
						modelName: "",
						docRef: document.id || null
					}
				]
			},
			id: documentIndex === 0 ? "1" : null
		},

		document: {
			target: {
				...document
			}
		}
	}));
}
