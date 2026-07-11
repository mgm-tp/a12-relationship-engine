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

import { it, expect, describe } from "vitest";

import {
	FORM_MODEL_VERSION as GENERATED_FORM_MODEL_VERSION,
	OVERVIEW_MODEL_VERSION as GENERATED_OVERVIEW_MODEL_VERSION,
	RESOLVED_MODEL_VERSIONS as GENERATED_RESOLVED_MODEL_VERSIONS
} from "../../../../../src/models/resolved-model-versions.js";
import {
	EventName,
	RUM_VERSION,
	DEFAULT_OK_LABEL,
	DEFAULT_ADD_LABEL,
	DEFAULT_EDIT_LABEL,
	FORM_MODEL_VERSION,
	LINK_DEFAULT_LABELS,
	DEFAULT_CANCEL_LABEL,
	OVERVIEW_MODEL_VERSION,
	RESOLVED_MODEL_VERSIONS,
	CANDIDATE_DEFAULT_LABELS,
	DEFAULT_DROPDOWN_EDIT_LABEL
} from "../../../../../src/internal/steps/RuM/extraction/constants.js";

describe("EventName", () => {
	it("matches all canonical row-action and row-activation event values", () => {
		expect(EventName.DeleteLink).toBe("event_delete_link");
		expect(EventName.RestoreLink).toBe("event_restore_link");
		expect(EventName.EditLinkDocument).toBe("event_edit_link_document");
		expect(EventName.AddLink).toBe("event_add_link");
		expect(EventName.OpenEditModal).toBe("event_open_edit_modal");
		expect(EventName.AddDocument).toBe("event_add_document");
		expect(EventName.CancelEditModal).toBe("event_cancel_edit_modal");
		expect(EventName.SubmitEditModal).toBe("event_submit_edit_modal");
	});

	it("uses generated resolved metadata for form and overview model versions", () => {
		expect(FORM_MODEL_VERSION).toBe(GENERATED_FORM_MODEL_VERSION);
		expect(OVERVIEW_MODEL_VERSION).toBe(GENERATED_OVERVIEW_MODEL_VERSION);
		expect(RESOLVED_MODEL_VERSIONS).toBe(GENERATED_RESOLVED_MODEL_VERSIONS);
		expect(FORM_MODEL_VERSION).toBe(RESOLVED_MODEL_VERSIONS.form.version);
		expect(OVERVIEW_MODEL_VERSION).toBe(RESOLVED_MODEL_VERSIONS.overview.version);
	});

	it("exposes the canonical RuM version", () => {
		expect(RUM_VERSION).toBeTypeOf("string");
		expect(RUM_VERSION.length).toBeGreaterThan(0);
	});
});

describe("Default labels", () => {
	it("contains all bilingual default button labels", () => {
		expect(DEFAULT_EDIT_LABEL).toEqual([
			{ locale: "en", text: "Edit" },
			{ locale: "de", text: "Bearbeiten" }
		]);
		expect(DEFAULT_DROPDOWN_EDIT_LABEL).toEqual([
			{ locale: "en", text: "Edit additional properties" },
			{ locale: "de", text: "Zusätzliche Eigenschaften bearbeiten" }
		]);
		expect(DEFAULT_ADD_LABEL).toEqual([
			{ locale: "en", text: "Add" },
			{ locale: "de", text: "Hinzufügen" }
		]);
		expect(DEFAULT_CANCEL_LABEL).toEqual([
			{ locale: "en", text: "Cancel" },
			{ locale: "de", text: "Abbrechen" }
		]);
		expect(DEFAULT_OK_LABEL).toEqual([
			{ locale: "en", text: "OK" },
			{ locale: "de", text: "OK" }
		]);
	});

	it("contains candidate and link default heading labels", () => {
		expect(CANDIDATE_DEFAULT_LABELS).toEqual([
			{ locale: "en", text: "Available Items" },
			{ locale: "de", text: "Verfügbare Einträge" }
		]);
		expect(LINK_DEFAULT_LABELS).toEqual([
			{ locale: "en", text: "Selected Items" },
			{ locale: "de", text: "Ausgewählte Einträge" }
		]);
	});
});
