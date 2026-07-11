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

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname, normalize, isAbsolute } from "node:path";

import type {
	ModelHeader,
	GenericModel,
	WorkspaceModel,
	SideResultModel,
	WorkspaceResource,
	SideResultResource,
	SideResultModelInput,
	MigrationStepContext,
	SideResultResourceInput
} from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

const FIXTURE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "__fixtures__");

/**
 * Extraction fixture config forwarded to MigrationStepContext.userConfig.
 */
export interface FixtureContextConfig {
	/** Enables keep-models behavior when explicitly true. Omitted stays absent in userConfig. */
	readonly keepModels?: boolean;
}

/**
 * Input accepted by the fixture context factory.
 */
export interface FixtureContextInput {
	/** Fixture JSON paths relative to `test/__fixtures__/`, or absolute file paths. */
	readonly fixturePaths?: readonly string[];
	/** Inline model objects to include in the in-memory workspace. */
	readonly models?: readonly GenericModel[];
	/** Optional user config; omit keepModels to exercise production default-absent behavior. */
	readonly config?: FixtureContextConfig;
}

/**
 * Test harness returned by createFixtureContext.
 */
export interface FixtureContextHarness {
	/** Mock migration step context usable with extractionTransform. */
	readonly context: MigrationStepContext;
	/** Returns models passed to context.addModel during the test. */
	readonly getAddedModels: () => readonly GenericModel[];
	/** Returns IDs passed to context.deleteModel during the test. */
	readonly getDeletedIds: () => readonly string[];
	/** Finds one model previously passed to context.addModel by header id. */
	readonly findAddedById: (id: string) => GenericModel | undefined;
}

/**
 * Loads one committed JSON fixture model from `test/__fixtures__/`.
 */
export function loadFixtureModel(fixturePath: string): GenericModel {
	const absolutePath = resolveFixturePath(fixturePath);
	const rawModel = JSON.parse(readFileSync(absolutePath, "utf8")) as unknown;

	assertModelWithHeader(rawModel, fixturePath);

	return rawModel;
}

/**
 * Loads committed JSON fixture models from `test/__fixtures__/`.
 */
export function loadFixtureModels(fixturePaths: readonly string[]): GenericModel[] {
	return fixturePaths.map(loadFixtureModel);
}

/**
 * Creates an in-memory MigrationStepContext for extraction fixture tests.
 */
export function createFixtureContext(input: FixtureContextInput = {}): FixtureContextHarness {
	const fixtureModels = loadFixtureModels(input.fixturePaths ?? []);
	const workspaceModels = [...fixtureModels, ...(input.models ?? [])];
	const modelMap = new Map(workspaceModels.map((model) => [getRequiredHeader(model).id, model]));
	const workspaceEntries = workspaceModels.map(createWorkspaceModel);
	const workspaceEntryMap = new Map(workspaceEntries.map((entry) => [entry.header.id, entry]));
	const addedModels: GenericModel[] = [];
	const deletedIds: string[] = [];

	const contextBase = {
		workspace: {
			models: workspaceEntries,
			resources: [],
			resolveModel(model: WorkspaceModel): GenericModel | undefined {
				return modelMap.get(model.header.id);
			},
			resolveResource(_resource: WorkspaceResource): Uint8Array | undefined {
				throwUnsupported("resolveResource");
			}
		},
		findResource(_path: string): WorkspaceResource | undefined {
			return undefined;
		},
		findModel(id: string): WorkspaceModel | undefined {
			return workspaceEntryMap.get(id);
		},
		findModelsByType(modelType: string): WorkspaceModel[] {
			return workspaceEntries.filter((entry) => entry.header.modelType === modelType);
		},
		resolveModel(model: WorkspaceModel): GenericModel | undefined {
			return modelMap.get(model.header.id);
		},
		resolveResource(_resource: WorkspaceResource): Uint8Array | undefined {
			throwUnsupported("resolveResource");
		},
		addResource(_input: SideResultResourceInput): SideResultResource {
			throwUnsupported("addResource");
		},
		addModel(inputModel: SideResultModelInput): SideResultModel {
			const header = getRequiredHeader(inputModel.model);
			const path = inputModel.path ?? `${header.id}.json`;
			const result = { model: inputModel.model, path };

			addedModels.push(inputModel.model);

			return result;
		},
		deleteCurrentModel(_reason?: string): void {
			throwUnsupported("deleteCurrentModel");
		},
		deleteModel(id: string, _reason?: string): void {
			deletedIds.push(id);
		},
		deleteResource(_path: string, _reason?: string): void {
			throwUnsupported("deleteResource");
		}
	};
	const context: MigrationStepContext =
		input.config === undefined ? contextBase : { ...contextBase, userConfig: { ...input.config } };

	return {
		context,
		getAddedModels(): readonly GenericModel[] {
			return [...addedModels];
		},
		getDeletedIds(): readonly string[] {
			return [...deletedIds];
		},
		findAddedById(id: string): GenericModel | undefined {
			return addedModels.find((model) => getRequiredHeader(model).id === id);
		}
	};
}

function resolveFixturePath(fixturePath: string): string {
	return isAbsolute(fixturePath) ? fixturePath : normalize(join(FIXTURE_ROOT, fixturePath));
}

function createWorkspaceModel(model: GenericModel): WorkspaceModel {
	const header = getRequiredHeader(model);

	return {
		header,
		path: `${header.id}.json`
	};
}

function getRequiredHeader(model: GenericModel): ModelHeader {
	const header = (model as { readonly header?: unknown }).header;

	if (!isModelHeader(header)) {
		throw new Error("Fixture model must have header.id, header.modelType and header.modelVersion");
	}

	return header;
}

function assertModelWithHeader(value: unknown, fixturePath: string): asserts value is GenericModel {
	if (typeof value !== "object" || value === null || !isModelHeader((value as { readonly header?: unknown }).header)) {
		throw new Error(
			`Fixture ${fixturePath} must contain a model with header.id, header.modelType and header.modelVersion`
		);
	}
}

function isModelHeader(value: unknown): value is ModelHeader {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { readonly id?: unknown }).id === "string" &&
		typeof (value as { readonly modelType?: unknown }).modelType === "string" &&
		typeof (value as { readonly modelVersion?: unknown }).modelVersion === "string"
	);
}

function throwUnsupported(methodName: string): never {
	throw new Error(`Fixture MigrationStepContext does not support ${methodName}`);
}
