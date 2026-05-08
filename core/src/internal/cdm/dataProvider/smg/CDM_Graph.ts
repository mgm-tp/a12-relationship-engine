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
 * @module cdm/data-provider
 * @experimental
 */

import { flatten } from "../../commons/utils.js";

/**
 * @internal
 *
 * Graph representation of the CDM for server request creation
 * - single root document model (reference)
 * - directed relationships
 * - minimal required properties
 */
export interface CDM_Graph {
	readonly root: DocModelReference;
	readonly relationships: DirectedRelationships;
}

/** @internal */
export interface DirectedRelationships {
	[sourceModelId: string]: CdmRelationship[];
}

/** @internal */
export interface DocModelReference {
	name: string;
}

/** @internal */
export interface CdmRelationship {
	readonly name: string;
	readonly sourceRole: string;
	readonly targetRole: string;
	readonly targetDocumentModel: string;
}

/** @internal */
export namespace CDM_Graph {
	export function createSimpleDocModel(name: string): DocModelReference {
		return { name };
	}

	export function relationshipById(smg: CDM_Graph, id: string): CdmRelationship | undefined {
		return flatten(smg.relationships).find((r) => r.name === id);
	}
}
