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

import {
	FORM_MODEL_VERSION,
	OVERVIEW_MODEL_VERSION,
	RESOLVED_MODEL_VERSIONS
} from "../../../../models/resolved-model-versions.js";

export { FORM_MODEL_VERSION, OVERVIEW_MODEL_VERSION, RESOLVED_MODEL_VERSIONS };

/** The canonical version for relationship UI model extraction output. */
export const RUM_VERSION = "2.0.0";

/** Canonical query model version used for all generated query artifacts. */
export const QUERY_MODEL_VERSION = "0.1.0";

/** Legacy synthetic form-model marker that triggers the extraction migration step. */
export const LEGACY_BINDING_FORM_MODEL_VERSION = "1.0.0";

/** Document model version used by committed fixture JSON files. */
export const DOCUMENT_MODEL_VERSION = "29.4.0";

/** Relationship model version used by committed fixture JSON files. */
export const RELATIONSHIP_MODEL_VERSION = "4.0.0";
