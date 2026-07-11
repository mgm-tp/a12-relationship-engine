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

import type { Header, Model as BaseModel } from "@com.mgmtp.a12.base/base-model-api";
import type { RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";
import type { QueryModel as QueryModelFromCore } from "@com.mgmtp.a12.querymodel/querymodel-core";

import type { FormModel } from "../../../../../models/form-model.js";
import type { BindingModel } from "../../../binding/binding-model.js";
import type { RelationshipUiModel } from "../../relationship-ui-model.js";
import type { OverviewModel } from "../../../../../models/overview-model.js";
import type { LegacyGeneratedDocumentModel } from "../../../../../models/legacy-generated-document-model.js";

import { getHeader } from "./header-accessors.js";

/**
 * Known component types for relationship UI components.
 */
export type ComponentType = "DualPaneSelection" | "TableList" | "DropDownSelection";

/**
 * Checks whether the given model is a form model (`modelType === "form"`).
 */
export function isFormModel(model: unknown): model is FormModel {
	if (typeof model !== "object" || model === null) {
		return false;
	}

	const header = getHeader(model);

	if (header?.modelType !== "form") {
		return false;
	}

	const content = Reflect.get(model, "content");

	if (content === null || typeof content !== "object" || Array.isArray(content)) {
		return false;
	}

	return Array.isArray(Reflect.get(content, "screens"));
}

/**
 * Checks whether the given model is an overview model (`modelType === "overview"`).
 */
export function isOverviewModel(model: unknown): model is OverviewModel {
	if (typeof model !== "object" || model === null) {
		return false;
	}

	const header = getHeader(model);

	return header?.modelType === "overview";
}

/**
 * Checks whether the given model is a legacy generated document model.
 */
export function isLegacyGeneratedDocumentModel(model: object): model is LegacyGeneratedDocumentModel {
	const header = getHeader(model);

	if (header?.modelType !== "document") {
		return false;
	}

	const content = Reflect.get(model, "content");

	if (content === null || typeof content !== "object" || Array.isArray(content)) {
		return false;
	}

	const modelRoot = Reflect.get(content, "modelRoot");

	if (modelRoot === null || typeof modelRoot !== "object" || Array.isArray(modelRoot)) {
		return false;
	}

	const rootGroups = Reflect.get(modelRoot, "rootGroups");

	return rootGroups === undefined || Array.isArray(rootGroups);
}

/**
 * Checks whether the given model is a relationship UI model (`modelType === "relationship-ui"`).
 */
export function isRelationshipUiModel(model: unknown): model is RelationshipUiModel {
	if (typeof model !== "object" || model === null) {
		return false;
	}

	const header = getHeader(model);

	return header?.modelType === "relationship-ui";
}

/**
 * Checks whether the given model is a relationship model (`modelType === "relationship"`).
 */
export function isRelationshipModel(model: unknown): model is RelationshipModel {
	if (typeof model !== "object" || model === null) {
		return false;
	}

	const header = getHeader(model);

	return header?.modelType === "relationship";
}

/**
 * Checks whether the given model is a document model (`modelType === "document"`). Pass the result through `deserializeReferencedModel` to obtain a concrete kernel-typed `DocumentModel`.
 */
export function isDocumentModel(model: unknown): model is BaseModel {
	if (typeof model !== "object" || model === null) {
		return false;
	}

	const header = getHeader(model);

	return header?.modelType === "document";
}

/**
 * Checks whether the given model is a query model (`modelType === "query"`).
 */
export function isQueryModel(model: unknown): model is QueryModelFromCore {
	if (typeof model !== "object" || model === null) {
		return false;
	}

	const header = getHeader(model);

	return header?.modelType === "query";
}

/**
 * Checks whether the given header (from a form model) has a `bindingConfiguration` annotation.
 *
 * @param header - The header to check, or `undefined`.
 * @returns `true` if the header has a `bindingConfiguration` annotation.
 */
export function hasBindingAnnotation(header: Header | undefined): boolean {
	return header?.annotations?.some((a) => a.name === "bindingConfiguration") ?? false;
}

/**
 * Checks whether `name` is a known relationship UI component type.
 */
export function isValidComponentType(name: string): name is ComponentType {
	return name === "DualPaneSelection" || name === "TableList" || name === "DropDownSelection";
}

/**
 * Checks whether the given value is a valid legacy `BindingModel`.
 */
export function isBindingModel(value: unknown): value is BindingModel {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}

	if (Reflect.get(value, "type") !== "relationship") {
		return false;
	}

	const elementId = Reflect.get(value, "elementId");

	if (typeof elementId !== "string" || elementId.length === 0) {
		return false;
	}

	const details = Reflect.get(value, "details");

	if (details === null || typeof details !== "object" || Array.isArray(details)) {
		return false;
	}

	const name = Reflect.get(details, "name");

	if (typeof name !== "string" || name.length === 0) {
		return false;
	}

	const relationshipName = Reflect.get(details, "relationshipName");

	if (typeof relationshipName !== "string" || relationshipName.length === 0) {
		return false;
	}

	const targetRole = Reflect.get(details, "targetRole");

	if (typeof targetRole !== "string" || targetRole.length === 0) {
		return false;
	}

	const metaInformation = Reflect.get(details, "metaInformation");

	if (metaInformation === null || typeof metaInformation !== "object" || Array.isArray(metaInformation)) {
		return false;
	}

	const metaInformationVersion = Reflect.get(metaInformation, "version");

	if (typeof metaInformationVersion !== "string") {
		return false;
	}

	const components = Reflect.get(details, "components");

	if (!Array.isArray(components) || components.length === 0) {
		return false;
	}

	return true;
}
