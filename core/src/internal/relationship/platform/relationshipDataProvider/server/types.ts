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

import { type Activity } from "@com.mgmtp.a12.client/client-core";
import {
	type JsonRpc2Request,
	type JsonRpc2Response,
	type QueryJsonRpc2Request,
	type Relationship,
	type LoadThumbnailUrlsJsonRpc2
} from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { type RelationshipActions } from "../../../actions.js";
import { type Relationship as RelationshipClientApi } from "../../../relationship.js";

/* @internal */
interface BaseRequestConfig<R extends JsonRpc2Request = JsonRpc2Request> {
	readonly id: string;
	readonly request: R;
}

/* @internal */
export interface RequestConfig extends BaseRequestConfig<QueryJsonRpc2Request> {
	readonly additionalConfig: {
		relationshipModel: string;
		sourceEntity: Relationship.LinkEntitySpec;
		targetRole: string;
	};
	readonly type: "candidate" | "link";
}

/* @internal */
export interface InstanceDocumentModel {
	readonly model: DocumentModel;
	readonly instanceId: string;
}

/* @internal */
export interface LoadRequestResult {
	readonly candidateInstances: RelationshipClientApi.CandidateInstance[];
	readonly candidateResultDocumentModels: InstanceDocumentModel[];
	readonly candidateRequests: RequestConfig[];
	readonly linkInstances: RelationshipClientApi.LinkInstance[];
	readonly linkResultDocumentModels: InstanceDocumentModel[];
	readonly linkRequests: RequestConfig[];
}

/* @internal */
export interface LoadResponseResult extends LoadRequestResult {
	readonly activity: Activity;
	readonly responses: JsonRpc2Response[];
	readonly updatePage?: boolean;
}

/* @internal */
export interface ResultPayloads {
	readonly candidatePayloads: RelationshipActions.Commands.SetCandidatesPayload[];
	readonly linkPayloads: RelationshipActions.Commands.SetLinksPayload[];
	readonly setPagePayloads: RelationshipActions.Commands.SetPagePayload[];
	readonly additionalThumbnailResponse?: LoadThumbnailUrlsJsonRpc2.Response;
}
