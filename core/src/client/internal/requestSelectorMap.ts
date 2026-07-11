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

import { type Selector, LocaleSelectors } from "@com.mgmtp.a12.client/client-core";
import type {
	Query,
	Relationship,
	QueryJsonRpc2Request,
	DocumentJsonRpc2Request,
	RelationshipJsonRpc2request
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import { RequestBuilder } from "./requestBuilder.js";

/**
 * @experimental Be aware that the API might be changed even in a minor release.
 *
 * Map of request selector factories for customizing how RE builds server requests.
 * When customizing, spread {@link DefaultRequestSelectorMap} and override specific methods.
 */
export interface RequestSelectorMap {
	/** Build query request for loading available items (DualPane available items pane). */
	queryCandidates(config: RequestSelectorMap.QueryCandidatesConfig): Selector<QueryJsonRpc2Request>;

	/**
	 * Build query request for loading links.
	 * Used by DualPane link pane, TableList, and DropDown selected items.
	 * The config's `context` field distinguishes the caller.
	 */
	queryLinks(config: RequestSelectorMap.QueryLinksConfig): Selector<QueryJsonRpc2Request>;

	/** Build query request for loading a single document. */
	queryDocument(config: RequestSelectorMap.QueryDocumentConfig): Selector<QueryJsonRpc2Request>;

	/** Build query request for loading a CDM document graph. */
	queryDocumentGraph(config: RequestSelectorMap.QueryDocumentGraphConfig): Selector<QueryJsonRpc2Request>;

	addDocument(config: RequestSelectorMap.AddDocumentConfig): Selector<DocumentJsonRpc2Request.AddJsonRpc2Request>;
	modifyDocument(
		config: RequestSelectorMap.ModifyDocumentConfig
	): Selector<DocumentJsonRpc2Request.ModifyJsonRpc2Request>;
	deleteDocument(
		config: RequestSelectorMap.DeleteDocumentConfig
	): Selector<DocumentJsonRpc2Request.DeleteJsonRpc2Request>;

	addLink(config: RequestSelectorMap.AddLinkConfig): Selector<RelationshipJsonRpc2request.AddLinkJsonRpc2request>;
	modifyLink(
		config: RequestSelectorMap.ModifyLinkConfig
	): Selector<RelationshipJsonRpc2request.ModifyLinkJsonRpc2request>;
	deleteLink(
		config: RequestSelectorMap.DeleteLinkConfig
	): Selector<RelationshipJsonRpc2request.DeleteLinkJsonRpc2request>;
}

export namespace RequestSelectorMap {
	export interface BaseConfig {
		readonly activityId: string;
		readonly id: string;
	}

	export interface QueryCandidatesConfig extends BaseConfig {
		readonly targetDocumentModel: string;
		readonly paging: Query.Paging;
		readonly constraint?: Query.Operator;
		readonly sort?: Query.Order[];
		readonly links?: Query.QueryLink[];
		readonly fields?: string[];
		/** Distinguishes the calling context for customization. */
		readonly context?: "dropdown" | "dropdown-inherited-init" | "dualPane" | "tableList";
	}

	export interface QueryLinksConfig extends BaseConfig {
		readonly targetDocumentModel: string;
		readonly paging: Query.Paging;
		readonly constraint?: Query.Operator;
		readonly sort?: Query.Order[];
		readonly links?: Query.QueryLink[];
		readonly fields?: string[];
		readonly exclude?: boolean;
		/** Distinguishes the calling context for customization. */
		readonly context?: "dualPane" | "tableList" | "dropdown";
	}

	export interface QueryDocumentConfig extends BaseConfig {
		readonly targetDocumentModel: string;
		readonly constraint?: Query.Operator;
		readonly fields?: string[];
	}

	export interface QueryDocumentGraphConfig extends BaseConfig {
		readonly targetDocumentModel: string;
		readonly paging: Query.Paging;
		readonly constraint?: Query.Operator;
		readonly fields?: string[];
	}

	export interface AddDocumentConfig extends BaseConfig {
		readonly modelId: string;
		readonly document: object;
	}

	export interface ModifyDocumentConfig extends BaseConfig {
		readonly docRef: string;
		readonly document: object;
	}

	export interface DeleteDocumentConfig extends BaseConfig {
		readonly docRef: string;
	}

	export interface AddLinkConfig extends BaseConfig {
		readonly linkRef: Relationship.LinkRef;
		readonly linkDocument?: object;
	}

	export interface ModifyLinkConfig extends BaseConfig {
		readonly linkRef: Relationship.LinkRef;
		readonly linkDocument?: object;
	}

	export interface DeleteLinkConfig extends BaseConfig {
		readonly linkRef: Relationship.LinkRef;
	}
}

/** Default implementation using `RequestBuilder`. */
export const DefaultRequestSelectorMap: RequestSelectorMap = {
	queryCandidates: (config) => () => {
		return RequestBuilder.query(config.id, {
			projectionName: "document",
			targetDocumentModel: config.targetDocumentModel,
			paging: config.paging,
			constraint: config.constraint,
			sort: config.sort,
			links: config.links,
			fields: config.fields
		});
	},
	queryLinks: (config) => () => {
		return RequestBuilder.query(config.id, {
			projectionName: "document",
			targetDocumentModel: config.targetDocumentModel,
			paging: config.paging,
			constraint: config.constraint,
			sort: config.sort,
			links: config.links,
			fields: config.fields,
			exclude: config.exclude
		});
	},
	queryDocument: (config) => () => {
		return RequestBuilder.query(config.id, {
			projectionName: "document",
			targetDocumentModel: config.targetDocumentModel,
			paging: { pageNumber: 0, pageSize: 1 },
			constraint: config.constraint,
			fields: config.fields
		});
	},
	queryDocumentGraph: (config) => () => {
		return RequestBuilder.query(config.id, {
			projectionName: "document-graph",
			targetDocumentModel: config.targetDocumentModel,
			paging: config.paging,
			constraint: config.constraint,
			fields: config.fields
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
