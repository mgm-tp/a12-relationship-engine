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

import { NEW_INSTANCE_IDENTIFIER } from "@com.mgmtp.a12.client/client-core";
import { type ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { createEmptyDocument, type FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import {
	type DocumentModel,
	type EntityInstancePath,
	type GroupInstance
} from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import {
	type DeepReadonly,
	type DgChangeLog,
	type DgChangeLogSlice,
	type DgSlice,
	type DocumentGraph
} from "../../documentGraph/core/index.js";
import { applyChanges } from "../../documentGraph/core/changeLog/changeLogImpl.js";
import * as DgOps from "../../documentGraph/core/impl/dg.js";

import { type CdmData, createEmptyCdmData } from "./cdmData.js";
import { createPresentRelationshipsCache } from "./setValue.js";
import { setValuesOfGroupInstance } from "./setValuesOfGroupInstance.js";

/**
 * @experimental
 * @internal
 */
export interface CreateInitialDgClParams {
	readonly cdm: DocumentModel;

	/** a form model based of the given cdm */
	readonly formModel: FormModel;
	readonly rootDocumentModelName: string;

	/**
	 * All document models referenced by the cdm. Needed to determine transitive
	 * fields only present in the cdm that will be stored in the cddDocument.
	 */
	readonly documentModelsInScene: DocumentModel[];
	/**
	 * The applications' model graph. Needed to detect heterogeneity and to
	 * determine fields of link document models via the relationship models.
	 */
	readonly modelGraph: ModelGraph;

	/**
	 * an optional doc ref for the root document of the new dg which is used
	 * instead of the {@link NEW_INSTANCE_IDENTIFIER}
	 */
	readonly rootDocRef?: string;

	/**
	 * optionally providable pre-existing dg and change log to be merged into the new dg and change log
	 */
	readonly mergeParams?: {
		readonly existingDocumentGraph: DeepReadonly<DocumentGraph>;
		readonly existingChangeLog: DgChangeLog;
	};
}

/**
 * Creates a new dg and change log containing the changes for initial values and
 * rows defined in the provided form model. The resulting dg already contains a
 * prefilled cddDocument and a prefilled root document.
 *
 * Filling initial values for a cdm with heterogeneous relationships will result
 * in an error.
 *
 * @experimental
 * @internal
 */
export function createInitialDgCl(params: CreateInitialDgClParams): DgSlice & DgChangeLogSlice {
	const { cdm, formModel, rootDocumentModelName, documentModelsInScene, modelGraph, rootDocRef, mergeParams } = params;

	const rootDocumentReference = rootDocRef ?? NEW_INSTANCE_IDENTIFIER;
	const emptyCdmData = createEmptyCdmData(cdm, rootDocumentModelName, rootDocumentReference);

	const documentWithInitialValues = createEmptyDocument(cdm, formModel);

	const initializedCdmData = createInitializedCdmData(
		emptyCdmData,
		documentWithInitialValues,
		cdm,
		documentModelsInScene,
		modelGraph
	);

	if (mergeParams) {
		const { existingDocumentGraph, existingChangeLog } = mergeParams;

		const [initializedDg] = DgOps.mergeInto({
			dg: existingDocumentGraph,
			partialDg: initializedCdmData.documentGraph
		});

		// adding the initialization changes to the existing changelog
		// except the first, which adds the already added root doc
		const initializedChangeLog = applyChanges(existingChangeLog, initializedCdmData.changeLog.changes.slice(1));

		return {
			documentGraph: initializedDg,
			changeLog: initializedChangeLog
		};
	} else {
		return {
			documentGraph: initializedCdmData.documentGraph,
			changeLog: initializedCdmData.changeLog
		};
	}
}

function createInitializedCdmData(
	emptyCdmData: CdmData,
	documentWithInitialValues: object,
	cdm: DocumentModel,
	documentModelsInScene: DocumentModel[],
	modelGraph: ModelGraph
): CdmData {
	const rootPath: EntityInstancePath = [];
	const rootGroup = cdm.content.modelRoot;

	return Object.keys(documentWithInitialValues).length === 0
		? emptyCdmData
		: setValuesOfGroupInstance(
				emptyCdmData,
				documentWithInitialValues as GroupInstance,
				rootPath,
				rootGroup,
				documentModelsInScene,
				modelGraph,
				"initializing",
				createPresentRelationshipsCache()
			);
}
