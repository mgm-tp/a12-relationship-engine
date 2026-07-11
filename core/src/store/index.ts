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

export * from "./internal/parent-link-descriptor.js";

export * from "./internal/state.js";
export * from "./internal/actions.js";
export * from "./internal/dataHolder.js";
export * from "./internal/OEDataGraphUtils.js";
export * from "./internal/dataReducers/index.js";
export * from "./internal/middlewares/index.js";
export * from "./internal/middlewares/types.js";
export * from "./internal/sagas/index.js";
export * from "./internal/selectors/changelog.js";
export * from "./internal/selectors/dataHolder.js";
export * from "./internal/selectors/documentGraph.js";
export * from "./internal/selectors/dropdown.js";
export * from "./internal/selectors/link.js";
export * from "./internal/selectors/model.js";
export * from "./internal/selectors/sourceEntity.js";
export * from "./internal/selectors/thumbnail.js";
export * from "./internal/selectors/uiState.js";
export * from "./internal/utils/linkIdAndDocRef.js";
export * from "./internal/utils/openLinkFormActivity.js";
export * from "./internal/utils/formModelLookup.js";
export * from "./internal/utils/instanceId.js";
export * from "./internal/utils/toCdd.js";
