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
import type { DocumentModel, GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import type { DocRef, RelshPath, DeepReadonly, LoadingState } from "../../../documentGraph/core/index.js";

/**
 * State shape of CDD
 * @experimental
 */
export interface CddState {
	/** Entry document of the CDD. */
	readonly rootDocRef: DocRef;

	/**
	 * The CDM is an object reference (snapshot) from the model slice It is
	 * also kept here so that the reducer can access it. This is OK because
	 * models never change.
	 */
	readonly cdm: DocumentModel;

	/**
	 * The computed CDD. It is stored here because a caching selector cannot
	 * be provided in a simple way. This is because that selector is used inside
	 * other selectors.
	 */
	readonly cachedCdd?: CachedCdd;

	/**
	 * Paths in the CDD that are not loaded (yet).
	 */
	readonly pendingUsages: PendingCddRelshUsages[];
	/**
	 * The link id of the selected item from the table list.
	 * Use to load correct link when duplicated allowed is enabled.
	 */
	readonly selectedLinkId?: string;

	/**
	 * Indicates whether the initial full pre-processing (validation + computation) has already been executed for the cdd state.
	 * Also prevents subsequent pre-processing to be called again unnecessarily.
	 */
	readonly preProcessed?: boolean;
}

/**
 * CDD metadata, i.e. CddState without the actual CDD.
 * @experimental
 */
export type PartialCddState = Omit<CddState, "cachedCdd">;

/**
 * @experimental
 */
export interface CachedCdd {
	readonly cdd: DeepReadonly<GroupInstance>;
	readonly snapshotChangeCounter?: number; //  cdd corresponds to changeLog/Dg with given changeCounter
}

/**
 * @experimental
 */
export interface PendingCddRelshUsages {
	readonly key: { relshName: string; targetDocRef: DocRef };

	readonly relshUsages: PendingRelshUsage[]; // track loading states for all usages of  <relsh, target>
}

/**
 * @experimental
 */
export interface PendingRelshUsage {
	readonly relshPath: RelshPath;
	readonly loadingState: Exclude<LoadingState, "loaded" | "error">;
}
