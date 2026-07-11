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

import type { DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import { type Model, NEW_INSTANCE_IDENTIFIER } from "@com.mgmtp.a12.client/client-core";

import { createTestModels } from "../../../mocks/ModelsUtil.js";
import { toCdd } from "../../../../internal/cdm/cdd/core/adapter/toCdd.js";
import * as DgOps from "../../../../internal/documentGraph/core/impl/dg.js";
import { MOCK_MODEL_GRAPH } from "../../../mocks/relationships/ModelGraph.js";
import { type CdmData, createEmptyCdmData } from "../../../../internal/cdm/cddUtils/cdmData.js";
import type { DeepReadonly, DocumentGraph, DgLinkInternal } from "../../../../internal/documentGraph/core/index.js";

export function replaceLinkRanksInDg(dg: DeepReadonly<DocumentGraph>): DeepReadonly<DocumentGraph> {
	const getNextRank = createGetNextRank();

	const linksByIdWithReplacedRank = Object.fromEntries(
		Object.entries((dg as DocumentGraph).links.byId).map((entry) => {
			const [key, link] = entry;
			const updatedLink: DgLinkInternal = { ...link, rank: getNextRank() };

			return [key, updatedLink] as const;
		})
	);

	return {
		...dg,
		links: {
			...dg.links,
			byId: linksByIdWithReplacedRank
		}
	};

	function createGetNextRank(): () => number {
		let rank = 0;

		return () => rank++;
	}
}

export function setupCddUtilsTestData(params?: { partialDg?: DocumentGraph }) {
	const testModelDescriptors: Model.Descriptor[] = [
		{
			name: "NaturalPersonCDM",
			modelType: "document"
		}
	];
	const testModels = createTestModels(testModelDescriptors);
	const cdm = testModels[0] as DocumentModel;
	const initialCdmData: CdmData = createEmptyCdmData(cdm, "NaturalPerson-document", NEW_INSTANCE_IDENTIFIER);

	const sceneDmDescriptors: Model.Descriptor[] = [
		{
			name: "NaturalPersonCDM",
			modelType: "document"
		},
		{
			name: "NaturalPerson-document",
			modelType: "document"
		},
		{
			name: "Address-document",
			modelType: "document"
		},
		{
			name: "Contract-document",
			modelType: "document"
		},
		{
			name: "CoInsurerAdditionalFields",
			modelType: "document"
		}
	];
	const documentModelsInScene = createTestModels(sceneDmDescriptors) as DocumentModel[];
	const cdmData = params?.partialDg ? extendCdmData(initialCdmData, params.partialDg) : initialCdmData;

	return {
		cdmData,
		documentModelsInScene,
		modelGraph: MOCK_MODEL_GRAPH
	};
}

function extendCdmData(data: CdmData, partialDg: DocumentGraph): CdmData {
	const [updatedDg] = DgOps.mergeInto({ dg: data.documentGraph, partialDg });
	const cdm = data.cddState.cdm;
	const updatedCdd = toCdd(updatedDg, NEW_INSTANCE_IDENTIFIER, cdm.content.modelRoot);

	return {
		documentGraph: updatedDg,
		changeLog: data.changeLog, // not extending the changeLog
		cddState: {
			...data.cddState,
			cachedCdd: {
				...data.cddState.cachedCdd,
				cdd: updatedCdd
			}
		}
	};
}
