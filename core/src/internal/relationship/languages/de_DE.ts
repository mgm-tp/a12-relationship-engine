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

import type { RESOURCE_KEYS } from "./keys.js";

/**
 * @internal
 */
export const de_DE: typeof RESOURCE_KEYS = {
	extension: {
		relationship: {
			component: {
				"progress-indicator": {
					loading: "Wird geladen"
				},
				"dual-pane": {
					"selected-items": "Ausgewählte Elemente",
					"available-items": "Verfügbare Elemente",
					"candidates-empty": "Keine Elemente zum Auswählen verfügbar.",
					"links-empty": "Leere Auswahl."
				},
				"drop-down": {
					"edit-link": "Weitere Eigenschaften",
					"result-count": "$resultCount$ von $totalCount$",
					"min-search-length": "Mindestens $count$ Zeichen eingeben"
				},
				"table-list": {
					edit: "Bearbeiten",
					"edit-dialog": {
						title: "Beziehung bearbeiten",
						close: "OK",
						cancel: "Abbrechen",
						veto: {
							title: "Ungespeicherte Änderungen!",
							message: "Wollen Sie wirklich beenden? Der Dialog enthält ungespeicherte Änderungen.",
							buttonDiscard: "Änderungen verwerfen",
							buttonAbort: "Zurück"
						}
					},
					add: "Hinzufügen"
				}
			}
		}
	}
};
