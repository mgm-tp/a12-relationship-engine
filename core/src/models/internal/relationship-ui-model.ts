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

import type { Header } from "@com.mgmtp.a12.base/base-model-api";
import type { LocalizedModelText } from "@com.mgmtp.a12.utils/utils-localization";

/**
 * A12 Model for Relationship UI configuration.
 *
 * This model defines the UI configuration for a relationship component,
 * replacing the legacy annotation-based binding configuration.
 *
 * @remarks
 * The model follows standard A12 model structure with `header` and `content`.
 * It should be referenced from a Form Model via `modelReferences`.
 */
export interface RelationshipUiModel {
	readonly header: Header;
	readonly content: RelationshipUiModel.Content;
}

export namespace RelationshipUiModel {
	/**
	 * The content of a relationship UI model, containing the UI configuration
	 * for rendering the relationship component.
	 */
	export interface Content {
		/** Name of the relationship model the UI is displayed for */
		readonly relationshipName: string;

		/** The target side of the relationship */
		readonly targetRole: string;

		/** The UI component configuration for this relationship */
		readonly component: ComponentConfiguration;

		/**
		 * Configures how to handle add/edit operations on the links.
		 *
		 * When set, linked documents will be opened in a separate activity.
		 */
		readonly modificationConfiguration?: ModificationConfiguration;
	}

	/**
	 * A button element in the UI model, following the same convention
	 * as OverviewModel.ButtonElement / TreeModel.ButtonElement.
	 */
	export interface ButtonElement {
		/** The event name that identifies this button's action (from RelationshipEngineEvents) */
		readonly event: string;
		/** Display label for the button */
		readonly label?: LocalizedModelText;
		/** Description/tooltip text */
		readonly description?: LocalizedModelText;
		/** Icon configuration */
		readonly icon?: ButtonIcon;
		/** Whether this is a destructive action (e.g., delete) */
		readonly destructive?: boolean;
		/** Whether this is a primary action button */
		readonly primary?: boolean;
		/** Whether to hide the label (icon-only display) */
		readonly labelHidden?: true;
		/** Confirmation dialog shown before executing the action */
		readonly confirmation?: ButtonConfirmation;
		/** CSS style classes */
		readonly styles?: ReadonlyArray<string>;
		/** Model annotations for extensibility */
		readonly annotations?: ReadonlyArray<Record<string, unknown>>;
	}

	/** Icon configuration for a button element */
	export interface ButtonIcon {
		readonly name: string;
		readonly theme?: "filled" | "outlined" | "rounded" | "custom";
	}

	/** Confirmation dialog shown before executing a button action */
	export interface ButtonConfirmation {
		readonly title?: LocalizedModelText;
		readonly message?: LocalizedModelText;
	}

	/**
	 * Supported component types for relationship UI.
	 */
	export type ComponentType = "DualPaneSelection" | "DropDownSelection" | "TableList";

	/**
	 * Configuration for the UI component within the relationship view.
	 * For DropDownSelection with QueryModel, use DropDownSelectionConfiguration instead.
	 */
	export interface ComponentConfiguration {
		/** Type of the UI component to render */
		readonly componentType: ComponentType;

		/**
		 * Reference to the overview model for displaying linked items.
		 * This is the primary overview model used by all component types.
		 * Not used when selectedItemQueryModel is specified.
		 */
		readonly selectedItemsOverviewModel?: string;

		/**
		 * Reference to the overview model for displaying available items.
		 * Required for DualPaneSelection and DropDownSelection components.
		 * Not used when availableItemsQueryModel is specified.
		 */
		readonly availableItemsOverviewModel?: string;

		/**
		 * Reference to the form model for editing link additional fields.
		 * Used when the relationship has additional fields on the link.
		 */
		readonly linkFormModel?: string;

		/**
		 * Edit configuration for TableList component.
		 * When present, the TableList will have an edit button opening a DualPane dialog.
		 */
		readonly editConfiguration?: EditConfiguration;

		/**
		 * Reference to the query model for fetching available items.
		 * Only applicable when componentType is "DropDownSelection".
		 * This query defines how to fetch available items for selection.
		 */
		readonly availableItemsQueryModel?: string;

		/**
		 * Reference to the query model for fetching the selected (linked) item.
		 * Only applicable when componentType is "DropDownSelection".
		 * This query should include a context placeholder (e.g., sourceDocRef)
		 * that will be replaced at runtime with the actual source document reference.
		 */
		readonly selectedItemQueryModel?: string;

		/**
		 * Element reference for the display label in DropDownSelection.
		 * Only applicable when componentType is "DropDownSelection".
		 * This follows the same pattern as overview model column's elementRef,
		 * allowing future support for expressions.
		 *
		 * Can be an element ID (e.g., "field_name") or a path (e.g., "entity/field_name").
		 * The path format is resolved at runtime from the target document model.
		 */
		readonly elementRef?: string;

		/**
		 * Buttons for this relationship component.
		 * Identified by event name (from RelationshipEngineEvents).
		 */
		readonly buttons?: ReadonlyArray<RelationshipUiModel.ButtonElement>;

		/**
		 * CSS height for the relationship component, passed through directly to the renderer.
		 * Supply any valid CSS length value (e.g. `"50%"`, `"60vh"`, `"auto"`, `"200px"`).
		 */
		readonly height?: string;
	}

	/**
	 * Configuration for the edit dialog when using TableList component.
	 * Defines how the DualPaneSelection edit dialog should be rendered.
	 */
	export interface EditConfiguration {
		/**
		 * Reference to the available items overview model for the edit DualPane.
		 */
		readonly availableItemsOverviewModel: string;

		/**
		 * Reference to the link overview model for the edit DualPane.
		 * This is always generated by the extraction tool as a clone of the parent's selectedItemsOverviewModel.
		 */
		readonly selectedItemsOverviewModel: string;

		/** Title for the edit dialog */
		readonly dialogTitle?: LocalizedModelText;

		/** CSS width for the edit dialog, e.g. "80%" or "900px". */
		readonly dialogWidth?: string;

		/** CSS max-width for the edit dialog, e.g. "1200px". Maps to ModalOverlay.maxWidth. */
		readonly dialogMaxWidth?: string;

		/** CSS max-height for the edit dialog, e.g. "80vh". Applied via style. */
		readonly dialogMaxHeight?: string;

		/** CSS height for the edit-dialog DualPane, passed through as a CSS string; does not affect inline TableList height. */
		readonly height?: string;
	}

	/**
	 * Configuration for add/edit operations in relationship UI components.
	 */
	export interface ModificationConfiguration {
		/**
		 * When true, the created activity descriptor will contain
		 * all properties of the parent activity's descriptor.
		 *
		 * @remarks
		 * May not be used in conjunction with `activityDescriptor`.
		 */
		readonly extendParentActivityDescriptor?: true;

		/**
		 * The activity descriptor for the new activity created
		 * when clicking the add/edit button.
		 *
		 * @remarks
		 * May not be used in conjunction with `extendParentActivityDescriptor`.
		 */
		readonly activityDescriptor?: ActivityDescriptor;
	}

	/**
	 * Activity descriptor for add/edit operations.
	 * Contains additional key/value-pairs to specify what the activity is doing.
	 */
	export interface ActivityDescriptor {
		/**
		 * Underlying type of data in Activity. By default, model is interpreted as the ID of an A12 Document Model.
		 */
		readonly model?: string;

		/**
		 * Specifies the ID of a business object, or in A12 context, a reference to an A12 data document.
		 */
		readonly instance?: string;

		/**
		 * Additional key/value-pairs to specify what the activity is doing.
		 */
		readonly [key: string]: string | undefined;
	}
}
