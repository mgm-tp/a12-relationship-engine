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

import type { WorkspaceModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import type { RelationshipBindingEntry, RelationshipBindingVisitor, RelationshipBindingComponent } from "./types.js";

/**
 * Iterates all relationship bindings across the workspace forms. Silently skips
 * non-form models, forms without bindingConfiguration, malformed JSON,
 * non-relationship bindings, and structurally malformed entries.
 */
export function forEachRelationshipBinding(
	workspaceModels: readonly WorkspaceModel[],
	visit: RelationshipBindingVisitor
): void {
	for (const model of workspaceModels) {
		if (!isWorkspaceFormModel(model)) {
			continue;
		}

		const bindingAnnotationValue = readBindingAnnotationValue(model.header.annotations);

		if (!bindingAnnotationValue) {
			continue;
		}

		const bindings = parseBindingConfiguration(bindingAnnotationValue);

		if (bindings === undefined) {
			continue;
		}

		for (const parsedBinding of bindings) {
			const bindingEntry = readRelationshipBindingEntry(parsedBinding);

			if (bindingEntry !== undefined) {
				visit(bindingEntry);
			}
		}
	}
}

function isWorkspaceFormModel(model: WorkspaceModel): boolean {
	return model.header.modelType === "form";
}

function readBindingAnnotationValue(annotations: unknown): string | undefined {
	if (!Array.isArray(annotations)) {
		return undefined;
	}

	for (const annotation of annotations) {
		if (readAnnotationName(annotation) !== "bindingConfiguration") {
			continue;
		}

		const annotationValue = readAnnotationStringValue(annotation);

		if (annotationValue !== undefined) {
			return annotationValue;
		}
	}

	return undefined;
}

function parseBindingConfiguration(value: string): readonly unknown[] | undefined {
	try {
		const parsed: unknown = JSON.parse(value);

		return Array.isArray(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

function readRelationshipBindingEntry(parsedBinding: unknown): RelationshipBindingEntry | undefined {
	if (readBindingType(parsedBinding) !== "relationship") {
		return undefined;
	}

	const bindingDetails = readRelationshipBindingDetails(parsedBinding);
	const relationshipName = readRelationshipBindingName(bindingDetails);
	const components = readRelationshipBindingComponentEntries(bindingDetails);

	if (relationshipName === undefined || components === undefined) {
		return undefined;
	}

	return {
		relationshipName,
		components: readRelationshipBindingComponents(components)
	};
}

function readRelationshipBindingDetails(parsedBinding: unknown): object | undefined {
	if (typeof parsedBinding !== "object" || parsedBinding === null || !("details" in parsedBinding)) {
		return undefined;
	}

	return typeof parsedBinding.details === "object" && parsedBinding.details !== null
		? parsedBinding.details
		: undefined;
}

function readRelationshipBindingName(bindingDetails: object | undefined): string | undefined {
	if (bindingDetails === undefined || !("relationshipName" in bindingDetails)) {
		return undefined;
	}

	return typeof bindingDetails.relationshipName === "string" && bindingDetails.relationshipName.length > 0
		? bindingDetails.relationshipName
		: undefined;
}

function readRelationshipBindingComponentEntries(bindingDetails: object | undefined): readonly unknown[] | undefined {
	if (bindingDetails === undefined || !("components" in bindingDetails)) {
		return undefined;
	}

	return Array.isArray(bindingDetails.components) ? bindingDetails.components : undefined;
}

function readRelationshipBindingComponents(components: readonly unknown[]): readonly RelationshipBindingComponent[] {
	const validComponents: RelationshipBindingComponent[] = [];

	for (const component of components) {
		const relationshipComponent = readRelationshipBindingComponent(component);

		if (relationshipComponent !== undefined) {
			validComponents.push(relationshipComponent);
		}
	}

	return validComponents;
}

function readRelationshipBindingComponent(component: unknown): RelationshipBindingComponent | undefined {
	if (typeof component !== "object" || component === null) {
		return undefined;
	}

	const modelRefs = readModelRefs(readComponentModels(component));
	const componentType = readComponentType(component);
	const pageSize = readComponentPageSize(component);

	return {
		...(pageSize !== undefined ? { candidatePageSize: pageSize } : {}),
		...(modelRefs.length > 0 ? { models: modelRefs } : {}),
		...(componentType !== undefined ? { componentType } : {})
	};
}

function readModelRefs(modelRefs: unknown): NonNullable<RelationshipBindingComponent["models"]> {
	if (!Array.isArray(modelRefs)) {
		return [];
	}

	return modelRefs.flatMap((modelRef): NonNullable<RelationshipBindingComponent["models"]> => {
		const use = readModelRefUse(modelRef);
		const name = readModelRefName(modelRef);

		if (use === undefined || name === undefined) {
			return [];
		}

		return name.length > 0 ? [{ use, name }] : [];
	});
}

function readAnnotationName(annotation: unknown): string | undefined {
	if (typeof annotation !== "object" || annotation === null || !("name" in annotation)) {
		return undefined;
	}

	return typeof annotation.name === "string" ? annotation.name : undefined;
}

function readAnnotationStringValue(annotation: unknown): string | undefined {
	if (typeof annotation !== "object" || annotation === null || !("value" in annotation)) {
		return undefined;
	}

	return typeof annotation.value === "string" ? annotation.value : undefined;
}

function readBindingType(parsedBinding: unknown): string | undefined {
	if (typeof parsedBinding !== "object" || parsedBinding === null || !("type" in parsedBinding)) {
		return undefined;
	}

	return typeof parsedBinding.type === "string" ? parsedBinding.type : undefined;
}

function readComponentModels(component: object): unknown {
	if (!("models" in component)) {
		return undefined;
	}

	return component.models;
}

function readComponentPageSize(component: object): number | undefined {
	if (!("candidatePageSize" in component)) {
		return undefined;
	}

	return typeof component.candidatePageSize === "number" ? component.candidatePageSize : undefined;
}

function readComponentType(component: object): string | undefined {
	if ("componentType" in component && typeof component.componentType === "string") {
		return component.componentType;
	}

	return "name" in component && typeof component.name === "string" ? component.name : undefined;
}

function readModelRefUse(modelRef: unknown): string | undefined {
	if (typeof modelRef !== "object" || modelRef === null || !("use" in modelRef)) {
		return undefined;
	}

	return typeof modelRef.use === "string" ? modelRef.use : undefined;
}

function readModelRefName(modelRef: unknown): string | undefined {
	if (typeof modelRef !== "object" || modelRef === null || !("name" in modelRef)) {
		return undefined;
	}

	return typeof modelRef.name === "string" ? modelRef.name : undefined;
}
