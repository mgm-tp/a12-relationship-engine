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

import type { FormModel } from "@com.mgmtp.a12.formengine/formengine-core";

import type { RelationshipUiModel } from "./relationship-ui-model.js";

/** Model type identifier for relationship UI models */
export const RELATIONSHIP_UI_MODEL_TYPE = "relationship-ui";

/** Annotation name used to reference a relationship UI model from a DetachedRepeat element. */
export const RELATIONSHIP_UI_MODEL_REFERENCE_ANNOTATION = "a12-relationship-ui-model-reference";

/**
 * Returns the relationship UI model id referenced by a DetachedRepeat element's
 * `a12-relationship-ui-model-reference` annotation, or `undefined` if the element
 * has no such annotation.
 * @internal
 */
export function getRelationshipUiModelRef(element: FormModel.ScreenElement): string | undefined {
	if (element.type === "CustomScreenElement" && element.reference) {
		return element.reference;
	}

	for (const annotation of element.annotations ?? []) {
		if (
			annotation.name === RELATIONSHIP_UI_MODEL_REFERENCE_ANNOTATION &&
			typeof annotation.value === "string" &&
			annotation.value !== ""
		) {
			return annotation.value;
		}
	}

	return undefined;
}

/**
 * Type guard to check if a model is a RelationshipUiModel.
 *
 * @param model - The model to check
 * @returns True if the model is a RelationshipUiModel
 */
export function isRelationshipUiModel(model: unknown): model is RelationshipUiModel {
	if (typeof model !== "object" || model === null) {
		return false;
	}

	const { header, content } = model as Partial<RelationshipUiModel>;

	if (typeof header !== "object" || header === null) {
		return false;
	}

	if (header.modelType !== RELATIONSHIP_UI_MODEL_TYPE) {
		return false;
	}

	if (typeof content !== "object" || content === null) {
		return false;
	}

	return isContent(content);
}

/**
 * Type guard to check if an object is a valid Content.
 *
 * @param content - The object to check
 * @returns True if the object is a valid Content
 */
export function isContent(content: unknown): content is RelationshipUiModel.Content {
	if (typeof content !== "object" || content === null) {
		return false;
	}

	const { relationshipName, targetRole, component } = content as Partial<RelationshipUiModel.Content>;

	return typeof relationshipName === "string" && typeof targetRole === "string" && isComponentConfiguration(component);
}

/**
 * Type guard to check if an object is a valid ComponentConfiguration.
 *
 * @param component - The object to check
 * @returns True if the object is a valid ComponentConfiguration
 */
export function isComponentConfiguration(component: unknown): component is RelationshipUiModel.ComponentConfiguration {
	if (typeof component !== "object" || component === null) {
		return false;
	}

	const { componentType, selectedItemsOverviewModel, selectedItemQueryModel } =
		component as Partial<RelationshipUiModel.ComponentConfiguration>;

	const validComponentTypes: RelationshipUiModel.ComponentType[] = [
		"DualPaneSelection",
		"DropDownSelection",
		"TableList"
	];

	return (
		typeof componentType === "string" &&
		validComponentTypes.includes(componentType as RelationshipUiModel.ComponentType) &&
		(typeof selectedItemsOverviewModel === "string" || typeof selectedItemQueryModel === "string")
	);
}

const VALID_COMPONENT_TYPES: readonly RelationshipUiModel.ComponentType[] = [
	"DualPaneSelection",
	"DropDownSelection",
	"TableList"
];

/**
 * Validates a {@link RelationshipUiModel} at runtime.
 *
 * Throws a descriptive `Error` when the model contains invalid or inconsistent data
 * that would lead to hard-to-debug failures downstream.
 *
 * @param model - The relationship UI model to validate
 * @throws Error if any invariant is violated
 * @internal
 */
export function validateRelationshipUiModel(model: RelationshipUiModel): void {
	const { content } = model;
	const modelId = model.header?.id ?? "<unknown>";

	validateRelationshipName(content, modelId);
	validateComponentType(content, modelId);
	validateTargetRole(content, modelId);
	validateModificationConfiguration(content, modelId);
}

function validateRelationshipName(content: RelationshipUiModel.Content, modelId: string): void {
	if (!content.relationshipName || content.relationshipName.trim().length === 0) {
		throw new Error(
			`[RelationshipUiModel "${modelId}"] "relationshipName" must be a non-empty string, ` +
				`got: "${content.relationshipName}".`
		);
	}
}

function validateComponentType(content: RelationshipUiModel.Content, modelId: string): void {
	const { componentType } = content.component;

	if (!VALID_COMPONENT_TYPES.includes(componentType)) {
		throw new Error(
			`[RelationshipUiModel "${modelId}"] "component.componentType" must be one of ` +
				`${VALID_COMPONENT_TYPES.map((t) => `"${t}"`).join(", ")}, ` +
				`got: "${String(componentType)}".`
		);
	}
}

function validateTargetRole(content: RelationshipUiModel.Content, modelId: string): void {
	if (!content.targetRole || content.targetRole.trim().length === 0) {
		throw new Error(
			`[RelationshipUiModel "${modelId}"] "targetRole" is required but was empty or missing. ` +
				`Component type "${content.component.componentType}" requires a valid target role.`
		);
	}
}

function validateModificationConfiguration(content: RelationshipUiModel.Content, modelId: string): void {
	const modConfig = content.modificationConfiguration;

	if (modConfig === undefined) {
		return;
	}

	if (modConfig.extendParentActivityDescriptor && modConfig.activityDescriptor) {
		throw new Error(
			`[RelationshipUiModel "${modelId}"] "modificationConfiguration" must not specify both ` +
				`"extendParentActivityDescriptor" and "activityDescriptor" at the same time.`
		);
	}
}
