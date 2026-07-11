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
import deepEqual from "fast-deep-equal";

import type { Model, Activity } from "@com.mgmtp.a12.client/client-core";
import type { FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import type { Model as ModelAPI } from "@com.mgmtp.a12.base/base-model-api";
import type { DocumentModel, IGeneratedCodeAccessor } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { OverviewModel, OverviewEngineApi } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import type {
	RelationshipModel,
	JsonRpc2ResponseError,
	Relationship as RelationshipServerApi
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import { isRecord } from "../shared/utils.js";

import { removeModelNameFromEntities } from "./shared.js";

const NativeError = Error;

/**
 * Relationship specific typings.
 */
export namespace Relationship {
	export type Mutation = LinkWithMutationMetadata;

	/**
	 * The mutation state categorizes the lifecycle phase of a link.
	 *
	 * * `added`: The link has been added. It didn't exist before last save.
	 * * `removed`: The link has been removed. It existed already before last save.
	 * * `withdrawn`: The link has been added and removed afterwards. Both actions took place after last save.
	 * * `existing`: The link existed before and still exists after last save.
	 * @experimental
	 */
	export type LinkMutationState = "added" | "removed" | "withdrawn" | "existing";

	/** @experimental */
	export interface LinkMutationMetadata {
		readonly mutationState?: LinkMutationState;
		/**
		 * A previously removed or withdrawn link has been "revived"
		 * by adding a new candidate which is based on the same entity.
		 */
		readonly relinked: boolean;
		/** The link document has been modified. */
		readonly modified: boolean;
	}

	/**
	 * Mutations are planned link modifications that will be applied after the Activity is at least saved.
	 * @experimental
	 */
	export interface LinkWithMutationMetadata extends LinkMutationMetadata {
		/** The modified link */
		readonly link: Relationship.LinkWithDocument;
	}

	/**
	 * Copy of Data Services LinkWithDocument interface
	 * but without `modelName` in linkDescriptor entities
	 * and linkRef instead of linkRefResponse
	 */
	export interface LinkWithDocument {
		readonly linkRef: RelationshipServerApi.LinkRef;
		readonly document: { [key: string]: unknown };
	}

	/**
	 * Copy of Data Services Candidate interface
	 * but without `modelName` in linkDescriptor entities
	 * and linkRef instead of linkRefResponse
	 */
	export interface Candidate {
		readonly linkRef: RelationshipServerApi.LinkRef;
		readonly document: { [key: string]: object };
	}

	/**
	 * Determines for a given model if it is a relationship model.
	 * @param model The model to be checked
	 */
	export function isRelationshipModel(model: ModelAPI): model is RelationshipModel {
		return model.header.modelType === "relationship";
	}

	/** Returns true if both descriptors are deep equal. */
	export function isLinkDescriptorEqual(
		linkDescriptor1: RelationshipServerApi.LinkDescriptor,
		linkDescriptor2: RelationshipServerApi.LinkDescriptor
	): boolean {
		return deepEqual(
			removeModelNameFromEntities(linkDescriptor1).entities,
			removeModelNameFromEntities(linkDescriptor2).entities
		);
	}

	/** Returns true if both descriptors point to the same document for the given role. */
	export function isLinkDescriptorEntityEqual(
		role: string,
		linkDescriptor1: RelationshipServerApi.LinkDescriptor,
		linkDescriptor2: RelationshipServerApi.LinkDescriptor
	): boolean {
		return (
			linkDescriptor1.entities.find((e) => e.role === role)?.docRef ===
			linkDescriptor2.entities.find((e) => e.role === role)?.docRef
		);
	}

	export namespace MutationDataHolder {
		/** Returns true if the given data holder holds mutation data. */
		export function isInstance(
			dataHolder: Activity.DataHolder
		): dataHolder is Activity.DataHolder<Relationship.Mutation[]> {
			return dataHolder.descriptor.feature === "relationship" && dataHolder.descriptor.type === "mutation";
		}
	}

	export namespace CandidateDataHolder {
		/** Returns true if the given data holder holds candidate instance data. */
		export function isInstance(
			dataHolder: Activity.DataHolder
		): dataHolder is Activity.DataHolder<Relationship.CandidateInstance> {
			return (
				dataHolder.descriptor.feature === "relationship" &&
				dataHolder.descriptor.type === "candidate" &&
				dataHolder.descriptor.instanceId !== undefined
			);
		}

		/**
		 * @internal
		 * Utility function to type guard a candidate data holder and identify it by instanceId
		 */
		export function isInstanceById(
			instanceId: string
		): (dataHolder: Activity.DataHolder) => dataHolder is Activity.DataHolder<Relationship.CandidateInstance> {
			return (dataHolder: Activity.DataHolder): dataHolder is Activity.DataHolder<Relationship.CandidateInstance> =>
				isInstance(dataHolder) && dataHolder.descriptor.instanceId === instanceId;
		}
	}

	export namespace LinkDataHolder {
		/** Returns true if the given data holder holds link instance data. */
		export function isInstance(
			dataHolder: Activity.DataHolder
		): dataHolder is Activity.DataHolder<Relationship.LinkInstance> {
			return (
				dataHolder.descriptor.feature === "relationship" &&
				dataHolder.descriptor.type === "link" &&
				dataHolder.descriptor.instanceId !== undefined
			);
		}

		/**
		 * @internal
		 * Utility function to type guard a link data holder and identify it by instanceId
		 */
		export function isInstanceById(
			instanceId: string
		): (dataHolder: Activity.DataHolder) => dataHolder is Activity.DataHolder<Relationship.LinkInstance> {
			return (dataHolder: Activity.DataHolder): dataHolder is Activity.DataHolder<Relationship.LinkInstance> =>
				isInstance(dataHolder) && dataHolder.descriptor.instanceId === instanceId;
		}
	}

	/**
	 * Part of an {@link Relationship.Instance} responsible for link data.
	 * It is managed in a separate data holder {@link Relationship.LinkDataHolder}.
	 */
	export interface LinkInstance {
		/** Unique identifier for this instance */
		readonly id: string;
		/** The configuration used to render the relationship UI */
		readonly uiConfiguration: UiConfiguration;
		/** The source side of the relationship. Candidates and links are derived from it. */
		readonly sourceEntity: RelationshipServerApi.LinkEntitySpec;
		/** List of loaded entities which are linked to the given source entity. */
		readonly links: Relationship.LinkWithDocument[];
		/** Conditions to query links from a data source. */
		readonly linkQuery: Query;
		/** The current paging information which is reflected to {@link LinkInstance#links} */
		readonly linkPagination: Pagination;
		/** The link which is currently modified in the UI. If not given, no link is modified. */
		readonly editLink?: Relationship.LinkWithDocument;
		/** The currently component in UI. Use when there are 2 components in a UiConfiguration (TableList and DualPane). */
		readonly componentName?: string;
	}
	/**
	 * Part of an {@link Relationship.Instance} responsible for candidate data.
	 * It is managed in a separate data holder {@link Relationship.CandidateDataHolder}.
	 */
	export interface CandidateInstance {
		/** Unique identifier for this instance */
		readonly id: string;
		/** The configuration used to render the relationship UI */
		readonly uiConfiguration: UiConfiguration;
		/** The source side of the relationship. Candidates and links are derived from it. */
		readonly sourceEntity: RelationshipServerApi.LinkEntitySpec;
		/** List of entities which can be added to the given source entity. */
		readonly candidates: RelationshipServerApi.Candidate[];
		/** Conditions to query candidates from a data source. */
		readonly candidateQuery: Query;
		/** The current paging information which is reflected to {@link CandidateInstance#candidates} */
		readonly candidatePagination: Pagination;
	}

	/** A data container collecting all information required to visualize a relationship between documents. */
	export interface Instance extends CandidateInstance, LinkInstance {}

	/** Query information for list and candidates */
	export interface Query {
		/** Page information about the query */
		readonly page: PageClause;
		/** Filter information about the query */
		readonly filter?: FilterClause;
		/** Sorting information about the query */
		readonly sorts?: SortClause[];
	}

	/** Page information about the query */
	export interface PageClause {
		/** Index of the first item needs to be fetched */
		readonly offset?: number;
		/** Maximum number of items are fetched */
		readonly limit?: number;
	}

	/** Filter information about the query */
	export interface FilterClause {
		/** Fulltext search string used to filter over all document fields */
		readonly fulltext?: string;
		/** Field based filter options */
		readonly filters?: OverviewEngineApi.FilterMap;
	}

	/** Sorting information about the query */
	export interface SortClause {
		/** The path to the field which shall be sorted */
		readonly path: string;
		/**
		 * The list order
		 * _ASC_ = Ascending
		 * _DSC_ = Descending
		 */
		readonly order: "ASC" | "DESC";
	}

	/** Data holder's complete pagination configuration */
	export interface Pagination {
		/** Number of the current page (zero-index) */
		readonly pageNumber: number;
		/** Number of items per page */
		readonly pageSize: number;
		/** The total count of items. Not all may be available on the client */
		readonly fullCount: number;
		/** Index of the first item to fetch */
		readonly offset: number;
		/** Number of items to fetch */
		readonly limit: number;
	}

	/**
	 * Relationship {@link Model#Binding} that describes the binding of elements to
	 * the relationship data context. A common example for this is the binding
	 * of a Form-Engine section to a dual pane.
	 */
	export type UiConfigurationBinding = Model.Binding<"relationship", UiConfiguration>;
	export namespace UiConfigurationBinding {
		/**
		 * Returns true if the given binding is {@link Relationship#UiConfigurationBinding} alike.
		 *
		 * @throws `Error` if the details of the binding is {@link Relationship#UiConfiguration}
		 *         alike but the version in its meta information does not equal
		 *         ` 1.0.0`.
		 */
		export function isInstance(binding: Model.Binding): binding is UiConfigurationBinding {
			return binding.type === "relationship" && UiConfiguration.isInstance(binding.details);
		}
	}

	/** The configuration used to render the relationship UI */
	export interface UiConfiguration {
		/** Additional meta information for the ui model. */
		readonly metaInformation: {
			/** Version of the ui model. */
			readonly version: "1.0.0";
		};

		/** Name of the configuration */
		readonly name: string;
		/** Name of the relationship model the UI is displayed for */
		readonly relationshipName: string;
		/** The target side of the relationship. */
		readonly targetRole: string;
		/**
		 * A list of component description used to compose the Relationship UI.
		 * The list is interpreted by the {@link RelationshipViews#RelationshipEngine}
		 */
		readonly components: ComponentConfiguration[];

		/**
		 * Configures how to handle add/edit operations on the links
		 *
		 * When this configuration is set, the linked documents will be opened
		 * in a separate activity.
		 * For to-1 relationships an additional add/edit button will be rendered.
		 */
		readonly modificationConfiguration?: ModificationConfiguration;
	}

	export namespace UiConfiguration {
		/**
		 * Returns true if the given object is {@link Relationship#UiConfiguration} alike.
		 *
		 * @throws `Error` if the config is {@link Relationship#UiConfiguration} alike but the
		 *         version in its meta information does not equal `1.0.0`.
		 */
		export function isInstance(config: object): config is UiConfiguration {
			const { name, relationshipName, targetRole, components, metaInformation }: Partial<UiConfiguration> = config;

			if (
				typeof name === "string" &&
				typeof relationshipName === "string" &&
				typeof targetRole === "string" &&
				Array.isArray(components) &&
				typeof metaInformation === "object"
			) {
				const { version } = metaInformation;

				if (version !== "1.0.0") {
					// This is the same as the global Error. However, due to a namespace with the same name I had to rename it.
					throw new NativeError(
						`The version of the relationship UiConfiguration ${name} is not compatible! ("${version}" !== "1.0.0")`
					);
				}

				return true;
			}

			return false;
		}
	}

	/** Component configuration of a relationship {@link Relationship#UiConfiguration}. */
	export interface ComponentConfiguration {
		/** Identifier of the configuration */
		readonly id: string;
		/** The name of the used UI component */
		readonly name: string;
		/** A list of UI models required to render the component */
		readonly models: { readonly name: string; readonly use: string }[];
		/** Page size of the candidate list */
		readonly candidatePageSize?: number;
		/** Page size of the link list */
		readonly linkPageSize?: number;
		/** Additional props passed to the component when rendering it */
		readonly props?: {
			readonly [key: string]: unknown;
		};
	}

	/**
	 * Configuration of add/edit buttons next to relationship UI components.
	 */
	export interface ModificationConfiguration {
		/**
		 * The add button label
		 */
		readonly addButtonLabel?: {
			locale: string;
			text: string;
		}[];

		/**
		 * The edit button label
		 */
		readonly editButtonLabel?: {
			locale: string;
			text: string;
		}[];

		/**
		 * Set to true if the {@link Activity#Descriptor} of the created
		 * activity should contain all properties of the parent activity's
		 * descriptor.
		 */
		readonly extendParentActivityDescriptor?: true;

		/**
		 * The activity descriptor for the new activity that will be created
		 * when clicking the button. May not be used in conjunction with
		 * {@link ModificationConfiguration#extendParentActivityDescriptor}.
		 */
		readonly activityDescriptor?: Activity.Descriptor;
	}

	/** Relationship related errors. */
	export type UiConfigurationInstance = UiConfiguration & {
		readonly id: string;
	};

	export namespace Error {
		/** Error that was caused by the server. */
		export interface ServerError extends Activity.Error.Base {
			readonly errorCode: "RELATIONSHIP_SERVER_ERROR";
			readonly errors: JsonRpc2ResponseError[];
		}

		export namespace ServerError {
			/** Returns true if the given error is {@link Relationship.Error#ServerError} alike. */
			export function isInstance(error: unknown): error is ServerError {
				return isRecord(error) && error.errorCode === "RELATIONSHIP_SERVER_ERROR";
			}
		}
	}

	/**
	 * Bundle of a overview model with the necessary document model and validator provider.
	 * It can only be accessed when all models are loaded.
	 */
	export type OverviewModels =
		| {
				readonly loadingState: "loaded";
				readonly overviewModel: OverviewModel;
				readonly documentModel: DocumentModel;
				readonly validatorProvider: IGeneratedCodeAccessor;
		  }
		| {
				readonly loadingState: "missing" | "loading" | "error";
		  };

	/**
	 * Bundle of a form model with the necessary document model and validator provider.
	 * It can only be accessed when all models are loaded.
	 */
	export type FormModels =
		| {
				readonly loadingState: "loaded";
				readonly formModel: FormModel;
				readonly documentModel: DocumentModel;
				readonly validatorProvider: IGeneratedCodeAccessor;
		  }
		| {
				readonly loadingState: "missing" | "loading" | "error";
		  };
}
