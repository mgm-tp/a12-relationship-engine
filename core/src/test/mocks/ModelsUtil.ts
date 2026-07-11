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

import * as Fs from "node:fs";
import * as Path from "node:path";

import type { Model } from "@com.mgmtp.a12.client/client-core";
import { isModelInstance, type Model as ModelAPI } from "@com.mgmtp.a12.base/base-model-api";
import { isOverviewModel, type OverviewModel } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import {
	isFormModel,
	type FormModel,
	defaultValueParser,
	unmarshallFormModel
} from "@com.mgmtp.a12.formengine/formengine-core";
import {
	type DocumentModel,
	DocumentServiceFactory,
	type IGeneratedCodeAccessor,
	GeneratedCodeAccessorFactory
} from "@com.mgmtp.a12.kernel/kernel-md-facade";

import type { ModelMap } from "../utils/models.js";
import { InternalModelSelectors } from "../../internal/shared/selectors.js";

export function createTestModels(modelDescriptors: Model.Descriptor[]): ModelAPI[] {
	return modelDescriptors.map(({ name, modelType }) => readModelType(name, modelType));
}

export function createA12TestModels(documentModelName: string, formModelName: string): ModelAPI[] {
	return [readDocumentAndValidationModel(documentModelName), readFormModel(formModelName)];
}

export function modelListToMap(models: ModelAPI[]): ModelMap {
	let map = {};

	for (const m of models) {
		map = { ...map, [m.header.id]: m };
	}

	return map;
}

export function readModelFile(modelName: string): string {
	return Fs.readFileSync(
		Path.join(import.meta.dirname, "..", "..", "..", "..", "showcase", "target", "data", "models", modelName),
		"utf8"
	);
}

function readModelType(name: string, type: string): ModelAPI {
	switch (type) {
		case "document":
			return readDocumentAndValidationModel(name);
		case "form":
			return readFormModel(name);
		default:
			return readModel(name);
	}
}

export function readModel(modelName: string): ModelAPI {
	const model = JSON.parse(readModelFile(`${modelName}.json`));

	if (!isModelInstance(model)) {
		throw new Error(`Model "${modelName}" does not fullfil the model API!`);
	}

	return model;
}

export function readDocumentAndValidationModel(modelName: string): Model.DocumentAndValidationModel {
	return createDocumentAndValidationModel(
		new DocumentServiceFactory().getDocumentModelSerializer().deserialize(JSON.stringify(readModel(modelName))),
		new GeneratedCodeAccessorFactory().createScriptAccessor(readModelFile(`${modelName}.validation.js`))
	);
}

export function createDocumentAndValidationModel(
	documentModel: DocumentModel,
	generatedCodeAccessor: IGeneratedCodeAccessor
): Model.DocumentAndValidationModel {
	return { ...documentModel, generatedCodeAccessor };
}

export function readFormModel(modelName: string): FormModel {
	const formModel = readModel(modelName);

	if (!isFormModel(formModel)) {
		throw new Error(`Model "${modelName}" is not a form model!`);
	}

	const documentModelRef = InternalModelSelectors.getDocumentModelReference(formModel);

	if (!documentModelRef) {
		throw new Error(`No document model reference found in form model "${modelName}"!`);
	}

	const { generatedCodeAccessor, ...documentModel } = readDocumentAndValidationModel(documentModelRef);

	return unmarshallFormModel(formModel, documentModel, defaultValueParser(documentModel));
}

export function readOverviewModel(modelName: string): OverviewModel {
	const overviewModel = readModel(modelName);

	if (!isOverviewModel(overviewModel)) {
		throw new Error(`Model "${modelName}" is not an overview model!`);
	}

	return overviewModel;
}
