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
 * @module server-connectors
 */

import { LocaleSelectors, type Selector } from "@com.mgmtp.a12.client/client-core";
import {
	type DocumentJsonRpc2Request,
	type Query,
	type QueryJsonRpc2Request,
	type RelationshipJsonRpc2request,
	type Relationship
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import { RequestBuilder } from "./requestBuilder.js";

/**
 * @experimental Be aware that the API might be changed even in a minor release.
 *
 * Map of request selector factories that can be customized.
 * When customizing, always spread the default factories.
 */
export interface RequestSelectorMap {
	/** Build a request to load relationship candidates. */
	loadCandidates: (config: RequestSelectorMap.LoadCandidatesConfig) => Selector<QueryJsonRpc2Request>;
	/** Build a request to load relationship links. */
	loadLinks: (config: RequestSelectorMap.LoadLinksConfig) => Selector<QueryJsonRpc2Request>;
	/** Build a request to load document graph. */
	loadDocumentGraph: (config: RequestSelectorMap.LoadDocumentGraphConfig) => Selector<QueryJsonRpc2Request>;

	addDocument: (config: RequestSelectorMap.AddDocumentConfig) => Selector<DocumentJsonRpc2Request.AddJsonRpc2Request>;
	modifyDocument: (
		config: RequestSelectorMap.ModifyDocumentConfig
	) => Selector<DocumentJsonRpc2Request.ModifyJsonRpc2Request>;
	deleteDocument: (
		config: RequestSelectorMap.DeleteDocumentConfig
	) => Selector<DocumentJsonRpc2Request.DeleteJsonRpc2Request>;
	addLink: (config: RequestSelectorMap.AddLinkConfig) => Selector<RelationshipJsonRpc2request.AddLinkJsonRpc2request>;
	modifyLink: (
		config: RequestSelectorMap.ModifyLinkConfig
	) => Selector<RelationshipJsonRpc2request.ModifyLinkJsonRpc2request>;
	deleteLink: (
		config: RequestSelectorMap.DeleteLinkConfig
	) => Selector<RelationshipJsonRpc2request.DeleteLinkJsonRpc2request>;
}

export namespace RequestSelectorMap {
	export interface BaseConfig {
		id: string;
		activityId: string;
	}

	export interface LoadCandidatesConfig extends BaseConfig {
		targetDocumentModel: string;
		paging: Query.Paging;
		constraint?: Query.Operator;
		sort?: Query.Order[];
		links: Query.QueryLink[];
		fields?: string[];
		exclude?: boolean;
	}

	export interface LoadLinksConfig extends BaseConfig {
		targetDocumentModel: string;
		paging: Query.Paging;
		constraint?: Query.Operator;
		sort?: Query.Order[];
		links: Query.QueryLink[];
		fields?: string[];
		exclude?: boolean;
	}

	export interface LoadDocumentGraphConfig extends BaseConfig {
		targetDocumentModel: string;
		fields?: string[];
		constraint?: Query.Operator;
		paging: Query.Paging;
	}

	export interface AddDocumentConfig extends BaseConfig {
		modelId: string;
		document: object;
	}

	export interface ModifyDocumentConfig extends BaseConfig {
		docRef: string;
		document: object;
	}

	export interface DeleteDocumentConfig extends BaseConfig {
		docRef: string;
	}

	export interface AddLinkConfig extends BaseConfig {
		linkRef: Relationship.LinkRef;
		linkDocument?: object;
	}

	export interface ModifyLinkConfig extends BaseConfig {
		linkRef: Relationship.LinkRef;
		linkDocument?: object;
	}

	export interface DeleteLinkConfig extends BaseConfig {
		linkRef: Relationship.LinkRef;
	}
}

export const DefaultRequestSelectorMap: RequestSelectorMap = {
	loadCandidates: (config) => () => {
		const { id, targetDocumentModel, paging, constraint, sort, links, fields, exclude } = config;
		return RequestBuilder.query(id, {
			projectionName: "document",
			targetDocumentModel,
			paging,
			constraint,
			sort,
			links,
			fields,
			exclude
		});
	},
	loadLinks: (config) => () => {
		const { id, targetDocumentModel, paging, constraint, sort, links, fields, exclude } = config;
		return RequestBuilder.query(id, {
			projectionName: "document",
			targetDocumentModel,
			paging,
			constraint,
			sort,
			links,
			fields,
			exclude
		});
	},
	loadDocumentGraph: (config) => () => {
		const { id, targetDocumentModel, fields, constraint, paging } = config;
		return RequestBuilder.query(id, {
			projectionName: "document-graph",
			targetDocumentModel,
			fields,
			constraint,
			paging
		});
	},

	addDocument:
		({ id, modelId, document }) =>
		(state) => {
			const locale = LocaleSelectors.locale()(state);
			return RequestBuilder.addDocument(id, modelId, document, locale);
		},
	modifyDocument:
		({ id, docRef, document }) =>
		(state) => {
			const locale = LocaleSelectors.locale()(state);
			return RequestBuilder.modifyDocument(id, docRef, document, locale);
		},
	deleteDocument:
		({ id, docRef }) =>
		(state) => {
			const locale = LocaleSelectors.locale()(state);
			return RequestBuilder.deleteDocument(id, docRef, locale);
		},
	addLink:
		({ id, linkRef, linkDocument }) =>
		() => {
			const req = RequestBuilder.addLink(linkRef, linkDocument);
			return { ...req, id };
		},
	modifyLink:
		({ id, linkRef, linkDocument }) =>
		() => {
			const req = RequestBuilder.modifyLink(linkRef, linkDocument);
			return { ...req, id };
		},
	deleteLink:
		({ id, linkRef }) =>
		() => {
			const req = RequestBuilder.deleteLink(linkRef);
			return { ...req, id };
		}
};
