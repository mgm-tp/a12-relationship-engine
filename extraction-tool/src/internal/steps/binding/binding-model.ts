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
 * Frozen snapshot of `Relationship.UiConfigurationBinding` and related types
 * as they existed when the binding extraction migration step was authored.
 *
 * These types describe the legacy binding model stored as a JSON-stringified annotation
 * value (`bindingConfiguration`) on A12 form models. The types are intentionally inlined
 * here so that this snapshot remains stable and independent of any upstream library version.
 *
 * External reference resolution:
 * - `Model.Binding<"relationship", UiConfiguration>` from `@com.mgmtp.a12.client/client-core`
 *   is inlined as `UiConfigurationBinding` (a plain interface with `type`, `elementId`, `details`).
 * - `Activity.Descriptor` from `@com.mgmtp.a12.client/client-core` is inlined as
 *   `ActivityDescriptor` (a `string`-valued index type), matching the actual shape.
 * - `LocalizedModelText` from `@com.mgmtp.a12.utils/utils-localization` is inlined
 *   as `LabelEntry[]` since it is a plain data type with no runtime behavior.
 *
 * @module binding/binding-model
 */

/**
 * A single localized label entry (inlined from utils-localization `LocalizedModelText`).
 */
interface LabelEntry {
	readonly locale: string;
	readonly text: string;
}

/**
 * The legacy binding stored inside the `bindingConfiguration` annotation on form models.
 *
 * This is a frozen snapshot of `Relationship.UiConfigurationBinding`
 * (= `Model.Binding<"relationship", UiConfiguration>`).
 */
export interface BindingModel {
	/** Always `"relationship"` for relationship bindings. */
	readonly type: "relationship";
	/** Id of the form element that this binding is attached to. */
	readonly elementId: string;
	/** The relationship UI configuration details. */
	readonly details: UiConfiguration;
}

/**
 * The configuration used to render the relationship UI.
 *
 * Frozen snapshot of `Relationship.UiConfiguration`.
 */
export interface UiConfiguration {
	/** Additional meta information for the ui model. */
	readonly metaInformation: {
		/** Version of the ui model — must be `"1.0.0"` for this snapshot. */
		readonly version: string;
	};

	/** Name of the configuration. */
	readonly name: string;
	/** Name of the relationship model the UI is displayed for. */
	readonly relationshipName: string;
	/** The target side of the relationship. */
	readonly targetRole: string;
	/**
	 * A list of component descriptions used to compose the Relationship UI.
	 */
	readonly components: ComponentConfiguration[];

	/**
	 * Configures how to handle add/edit operations on the links.
	 */
	readonly modificationConfiguration?: ModificationConfiguration;
}

/**
 * Component configuration of a relationship `UiConfiguration`.
 *
 * Frozen snapshot of `Relationship.ComponentConfiguration`.
 */
export interface ComponentConfiguration {
	/** Identifier of the configuration. */
	readonly id?: string;
	/** The name of the used UI component (e.g. `"DualPaneSelection"`, `"TableList"`). */
	readonly name: string;
	/** A list of UI models required to render the component. */
	readonly models: { readonly name: string; readonly use: string }[];
	/** Page size of the candidate list. */
	readonly candidatePageSize?: number;
	/** Page size of the link list. */
	readonly linkPageSize?: number;
	/** Additional props passed to the component when rendering it. */
	readonly props?: {
		readonly [key: string]: unknown;
	};
}

/**
 * Configuration of add/edit buttons next to relationship UI components.
 *
 * Frozen snapshot of `Relationship.ModificationConfiguration`.
 */
export interface ModificationConfiguration {
	/** The add button label. */
	readonly addButtonLabel?: LabelEntry[];

	/** The edit button label. */
	readonly editButtonLabel?: LabelEntry[];

	/**
	 * Set to `true` if the activity descriptor of the created activity
	 * should contain all properties of the parent activity's descriptor.
	 */
	readonly extendParentActivityDescriptor?: true;

	/**
	 * The activity descriptor for the new activity created when clicking the button.
	 * May not be used in conjunction with `extendParentActivityDescriptor`.
	 *
	 * Inlined from `Activity.Descriptor` — a string-valued record.
	 */
	readonly activityDescriptor?: { readonly [key: string]: string | undefined };
}
