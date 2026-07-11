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

import type { Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";
import type { EntityInstancePath, FieldInstanceValue } from "@com.mgmtp.a12.kernel/kernel-md-facade";

/** @internal */
export interface Changelog {
	changes: Changelog.Change[];
	checkpoints: Changelog.Checkpoint[];
	/**
	 * Entries seeded or injected from a parent activity carry `inherited: true` on the individual
	 * `Changelog.Change` entry. These entries:
	 * - are applied to the DocumentGraph (so the form sees the link/document)
	 * - are skipped when computing changes to merge back up to the parent
	 * - are non-editable / non-removable in the UI (enforced in Step 06)
	 * - are still emitted by `effectiveChanges` for the persist path (non-RE parent case)
	 * Activities with only inherited entries are treated as not-dirty.
	 */
}

/** @internal */
export namespace Changelog {
	export type Change =
		| LinkAdded
		| LinkDeleted
		| LinkDocChanged
		| DocAdded
		| DocChanged
		| CdmRootComputed
		| SubDocumentGraphAdded;

	export type CheckpointScope = "detachedRepeat" | string;

	export interface Checkpoint {
		readonly id: string;
		readonly scope: CheckpointScope;
		readonly changeCount: number;
		readonly createdAt: number;
	}

	export interface LinkAdded {
		readonly kind: "linkAdded";
		readonly linkId: string;
		readonly linkRef: Relationship.LinkRef;
		readonly linkDocument?: object;
		/** Snapshot of the target document, captured when the overview is in exclude mode. */
		readonly targetDocument?: object;
		/** Target document model id, captured alongside targetDocument. */
		readonly targetDocumentModelName?: string;
		/** When true, this entry was seeded/injected from a parent activity. See {@link Changelog} for semantics. */
		readonly inherited?: boolean;
	}

	export interface LinkDeleted {
		readonly kind: "linkDeleted";
		readonly linkId: string;
		readonly linkRef: Relationship.LinkRef;
		/** When true, this entry was seeded/injected from a parent activity. See {@link Changelog} for semantics. */
		readonly inherited?: boolean;
	}

	export interface LinkDocChanged {
		readonly kind: "linkDocChanged";
		readonly linkId: string;
		readonly linkRef: Relationship.LinkRef;
		readonly linkDocument?: object;
		readonly documentModelName?: string;
		readonly path?: EntityInstancePath;
		readonly value?: FieldInstanceValue;
		/** When true, this entry was seeded/injected from a parent activity. See {@link Changelog} for semantics. */
		readonly inherited?: boolean;
	}

	export interface DocAdded {
		readonly kind: "docAdded";
		readonly docRef: string;
		readonly document: object;
		readonly documentModelName: string;
		/** When true, this entry was seeded/injected from a parent activity. See {@link Changelog} for semantics. */
		readonly inherited?: boolean;
	}
	export interface DocChanged {
		readonly kind: "docChanged";
		readonly documentModelName: string;
		readonly docRef: string;
		/** Full document replacement. When set, `path`/`value` are absent. */
		readonly document?: object;
		/** Field-level patch target path. Required when `document` is absent. */
		readonly path?: EntityInstancePath;
		/** Field-level patch value. Required when `document` is absent. */
		readonly value?: FieldInstanceValue;
		/** When true, this entry was seeded/injected from a parent activity. See {@link Changelog} for semantics. */
		readonly inherited?: boolean;
	}

	/**
	 * Replaces the CDM root document entirely with a freshly computed snapshot.
	 * Always targets {@link DocumentGraph.ROOT_DOC_REF} — no explicit `docRef` needed.
	 * Never persisted to the backend; excluded from save, merge, and seeding paths.
	 * Does not set the dirty flag on data holders.
	 */
	export interface CdmRootComputed {
		readonly kind: "cdmRootComputed";
		readonly document: object;
		readonly documentModelName: string;
	}

	/**
	 * Caches a resolved sub-document-graph fragment fetched for a CDM `linkAdded` entry.
	 * Emitted by `LoadSubDocumentGraphHandler` after fetching and resolving a groupPath subtree.
	 *
	 * Stored in the changelog so that rollback and merge can replay sub-document-graph data
	 * without re-fetching from the server. CDM only — never emitted for non-CDM activities.
	 * Never persisted to the backend; excluded from save paths.
	 */
	export interface SubDocumentGraphAdded {
		readonly kind: "subDocumentGraphAdded";
		readonly relationshipModelName: string;
		readonly documents: Record<string, DocumentGraph.Document>;
		readonly links: DocumentGraph.Link[];
	}
}

/** @internal */
export interface DocumentGraph {
	documents: DocumentGraph.Documents;
	links: DocumentGraph.Links;
	changelogIndex: number;
}

/** @internal */
export namespace DocumentGraph {
	export const ROOT_DOC_REF = "cddDocument/0";

	export type LoadingState = "missing" | "loading" | "loaded" | "error";

	export type Document =
		| {
				readonly docRef: string;
				readonly document: object;
				readonly documentModelName: string;
				readonly loadingState: "loaded";
		  }
		| {
				readonly docRef: string;
				readonly loadingState: Exclude<LoadingState, "loaded">;
		  };

	export interface Documents {
		readonly byDocRef: Record<string, Document>;
	}

	export interface Links {
		readonly byId: LinksById;
		// `byRms` (per-RM lookup with ordering) is intentionally omitted. Add it when a feature actually needs per-relationship-model ordering — at that point, ensure inserts are properly ordered.
		readonly linkIdsByDocId: { [docId: string]: string[] | undefined };
	}

	export interface LinksById {
		[id: string]: Link;
	}
	export interface Link {
		readonly linkRef: Relationship.LinkRef;
		/**
		 * If not null/undefined, the linkDocument can be found in the dg docs
		 */
		readonly linkDocRef?: string | null;
	}
}

/** @internal */
export type Cdd = object;

/**
 * UI state for the relationship engine, stored in the default data holder's slices.
 * @internal
 */
export interface RelationshipEngineUiState {
	readonly dialog: Dialog;
}

/** @internal */
export namespace RelationshipEngineUiState {
	export const SLICE_KEY = "relationshipEngineUiState";

	export function empty(): RelationshipEngineUiState {
		return { dialog: null };
	}
}

/**
 * Dialog state for the relationship engine UI.
 * Similar pattern to tree-engine's dialog handling.
 * @internal
 */
export type Dialog = Dialog.VariantSelection | Dialog.Edit | null;

/** @internal */
export namespace Dialog {
	export enum Type {
		VARIANT_SELECTION = "variantSelection",
		EDIT = "edit"
	}

	export interface BaseDialog {
		readonly type: Type;
	}
	export namespace BaseDialog {
		export function isAssignableFrom(o: unknown): o is BaseDialog {
			return typeof o === "object" && o !== null && "type" in o;
		}
	}

	/**
	 * Dialog state for selecting a variant/subtype when creating a new entity.
	 */
	export interface VariantSelection extends BaseDialog {
		readonly type: Type.VARIANT_SELECTION;
		/** The document model ID of the target type to select a variant for */
		readonly targetDocumentModelId: string;
		/** Context information for the action that triggered this dialog */
		readonly context: VariantSelection.Context;
	}

	export namespace VariantSelection {
		export interface Context {
			readonly activityId: string;
			readonly instanceId: string;
			readonly relationshipName: string;
			readonly targetRole: string;
			readonly sourceDocRef: string;
			readonly sourceRole: string;
		}

		export function isAssignableFrom(o: unknown): o is VariantSelection {
			return BaseDialog.isAssignableFrom(o) && o.type === Type.VARIANT_SELECTION;
		}
	}

	/**
	 * Dialog state for editing a link in a TableList component.
	 */
	export interface Edit extends BaseDialog {
		readonly type: Type.EDIT;
		/** The activity ID containing the TableList */
		readonly activityId: string;
		/** The instance ID of the TableList */
		readonly instanceId: string;
		/** Checkpoint ID pushed when the dialog was opened; used to rollback on cancel */
		readonly checkpointId: string;
	}

	export namespace Edit {
		export function isAssignableFrom(o: unknown): o is Edit {
			return BaseDialog.isAssignableFrom(o) && o.type === Type.EDIT;
		}
	}
}
