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

import type { LocalizedModelText } from "@com.mgmtp.a12.utils/utils-localization";

/** Usage type constant for attachment groups. */
export const ATTACHMENT_USAGE_TYPE = "attachment";

/** Usage type constant for multi-select groups. */
export const MULTI_SELECT_USAGE_TYPE = "multi-select";

export {
	FORM_MODEL_VERSION,
	OVERVIEW_MODEL_VERSION,
	RESOLVED_MODEL_VERSIONS,
	RUM_VERSION,
	QUERY_MODEL_VERSION,
	LEGACY_BINDING_FORM_MODEL_VERSION,
	DOCUMENT_MODEL_VERSION,
	RELATIONSHIP_MODEL_VERSION
} from "./versions.js";

/**
 * The version prefix applied to generated models to distinguish them
 * from manually created models in the workspace.
 */
export const GENERATED_MODEL_VERSION_PREFIX = "____generated";

/**
 * Edit clones append this suffix to the source overview ID.
 */
export const EDIT_CLONE_SUFFIX = "-edit";

/**
 * Separator used for relationship-specific multi-context overview clones.
 */
export const MULTI_CONTEXT_SEPARATOR = "--";

/**
 * Canonical event names emitted by row-action and row-activation migrations.
 * Members are string-valued so the runtime model JSON serializes to the same
 * legacy literals downstream consumers expect.
 */
export enum EventName {
	DeleteLink = "event_delete_link",
	RestoreLink = "event_restore_link",
	EditLinkDocument = "event_edit_link_document",
	AddLink = "event_add_link",
	OpenEditModal = "event_open_edit_modal",
	AddDocument = "event_add_document",
	CancelEditModal = "event_cancel_edit_modal",
	SubmitEditModal = "event_submit_edit_modal"
}

/**
 * Default "Edit" button label (TableList edit fallback).
 */
export const DEFAULT_EDIT_LABEL: LocalizedModelText = [
	{ locale: "en", text: "Edit" },
	{ locale: "de", text: "Bearbeiten" }
];

/**
 * Default "Edit additional properties" label (DropDown edit + accessible label).
 */
export const DEFAULT_DROPDOWN_EDIT_LABEL: LocalizedModelText = [
	{ locale: "en", text: "Edit additional properties" },
	{ locale: "de", text: "Zusätzliche Eigenschaften bearbeiten" }
];

/**
 * Default "Add" button label.
 */
export const DEFAULT_ADD_LABEL: LocalizedModelText = [
	{ locale: "en", text: "Add" },
	{ locale: "de", text: "Hinzufügen" }
];

/**
 * Default "Cancel" button label.
 */
export const DEFAULT_CANCEL_LABEL: LocalizedModelText = [
	{ locale: "en", text: "Cancel" },
	{ locale: "de", text: "Abbrechen" }
];

/**
 * Default "OK" button label.
 */
export const DEFAULT_OK_LABEL: LocalizedModelText = [
	{ locale: "en", text: "OK" },
	{ locale: "de", text: "OK" }
];

/**
 * Candidate / "Available Items" heading label.
 */
export const CANDIDATE_DEFAULT_LABELS: LocalizedModelText = [
	{ locale: "en", text: "Available Items" },
	{ locale: "de", text: "Verfügbare Einträge" }
];

/**
 * Link / "Selected Items" heading label.
 */
export const LINK_DEFAULT_LABELS: LocalizedModelText = [
	{ locale: "en", text: "Selected Items" },
	{ locale: "de", text: "Ausgewählte Einträge" }
];
