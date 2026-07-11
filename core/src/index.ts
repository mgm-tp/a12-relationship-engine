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

export * from "./internal/relationship/index.js";
export * from "./internal/cdm/cdd/core/index.js";
export * from "./internal/cdm/cdd/redux/index.js";
export * from "./internal/cdm/index.js";
export * from "./internal/documentGraph/core/index.js";
export * from "./internal/documentGraph/redux/index.js";
export * from "./internal/server-connectors/request-selector-map.js";

export * from "./main/applicationFactory.js";

/**
 * @experimental
 * Collection of API from the new Relationship Engine architecture
 * which is planned to be used by other components.
 *
 * More public APIs are to come but not at this stage, due to the need of stabilization
 */
export * from "./main/composable.js";
export * from "./main/factories.js";

export { ParentLinkDescriptor } from "./store/index.js";
export type { RelationshipEngineMiddlewareOptions } from "./store/index.js";

export type { RelationshipUiModel } from "./models/index.js";
export { isRelationshipUiModel, SUPPORTED_MODEL_VERSIONS } from "./models/index.js";

export type { RelationshipEngineFormModelMap, RelationshipEngineFormModelMapOptions } from "./view/index.js";

export type { RelationshipEngineDataProviderOptions } from "./client/index.js";
