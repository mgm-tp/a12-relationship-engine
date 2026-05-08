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
 * @module relationship
 */

import { Model, ModelSelectors } from "@com.mgmtp.a12.client/client-core";
import { type Models, type FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import { type DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { Relationship as RelationshipClientApi } from "../../relationship.js";

/**
 * @internal
 * exported for testing purpose
 */
export namespace RelationshipDataProviderSelectors {
	export function selectDocumentModel(state: object, documentModelName: string): DocumentModel {
		const documentModelInformation = ModelSelectors.modelByName(
			documentModelName,
			Model.isDocumentAndValidationModel
		)(state);
		if (documentModelInformation === undefined) {
			throw new Error(`The document model "${documentModelName}" cannot be found!"`);
		}

		return documentModelInformation;
	}

	export function selectLinkDocumentModel(state: object, relationshipModelName: string): DocumentModel | undefined {
		const linkDocumentModelName = selectLinkDocumentModelName(state, relationshipModelName);
		if (linkDocumentModelName === undefined) {
			return undefined;
		}

		const linkDocumentModel = ModelSelectors.modelByName(
			linkDocumentModelName,
			Model.isDocumentAndValidationModel
		)(state);

		if (linkDocumentModel === undefined) {
			throw new Error(
				`Cannot find link document model ${linkDocumentModelName} of relationship model ${relationshipModelName} in store`
			);
		}

		return linkDocumentModel;
	}

	export function selectLinkDocumentModelName(state: object, relationshipModelName: string): string | undefined {
		const relationshipModel = ModelSelectors.modelByName(
			relationshipModelName,
			RelationshipClientApi.isRelationshipModel
		)(state);

		if (relationshipModel === undefined) {
			throw new Error(`Cannot find relationship model ${relationshipModelName} in store`);
		}

		return relationshipModel.content.linkDocumentModel ?? undefined;
	}

	export function selectLinkDocumentModelTuple(
		state: object,
		activityId: string,
		relationshipModelName: string
	): Models | undefined {
		const linkDocumentModel = selectLinkDocumentModel(state, relationshipModelName);
		if (!linkDocumentModel) {
			return undefined;
		}

		const linkFormModel = selectFormModelUsingDocumentModel(state, activityId, linkDocumentModel.header.id);
		if (!linkFormModel) {
			return undefined;
		}

		return { formModel: linkFormModel, documentModel: linkDocumentModel } as Models;
	}

	export function selectModelTuple(
		state: object,
		activityId: string,
		documentModel: DocumentModel
	): Models | undefined {
		const linkFormModel = selectFormModelUsingDocumentModel(state, activityId, documentModel.header.id);
		if (!linkFormModel) {
			return undefined;
		}

		return { formModel: linkFormModel, documentModel } as Models;
	}

	export function selectFormModelUsingDocumentModel(
		state: object,
		activityId: string,
		documentModelId: string
	): FormModel | undefined {
		const modelsInScene = ModelSelectors.allModelsInScene(activityId)(state);
		const formModel = modelsInScene.find(
			(m) =>
				m.header.modelType === "form" &&
				m.header.modelReferences?.some((ref) => ref.modelType === "document" && ref.reference === documentModelId)
		);

		return formModel ? (formModel as FormModel) : undefined;
	}
}
