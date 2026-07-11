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

import type { Locale } from "@com.mgmtp.a12.utils/utils-localization";
import type {
	Query,
	Relationship,
	QueryJsonRpc2Request,
	DocumentJsonRpc2Request,
	LoadThumbnailUrlsJsonRpc2,
	RelationshipJsonRpc2request
} from "@com.mgmtp.a12.dataservices/dataservices-access";

const JSON_RPC_VERSION = "2.0";
let requestCounter = 0;
export const RequestBuilder = {
	addDocument(
		id: string,
		documentModelName: string,
		document: object,
		locale: Locale
	): DocumentJsonRpc2Request.AddJsonRpc2Request {
		return {
			jsonrpc: JSON_RPC_VERSION,
			method: "ADD_DOCUMENT",
			id,
			params: {
				documentModelName,
				document,
				// Data Services requires only the language
				locale: locale.language
			}
		};
	},

	modifyDocument(
		id: string,
		docRef: string,
		document: object,
		locale: Locale
	): DocumentJsonRpc2Request.ModifyJsonRpc2Request {
		return {
			jsonrpc: JSON_RPC_VERSION,
			method: "MODIFY_DOCUMENT",
			id,
			params: {
				docRef,
				document,
				// Data Services requires only the language
				locale: locale.language
			}
		};
	},

	deleteDocument(id: string, docRef: string, locale: Locale): DocumentJsonRpc2Request.DeleteJsonRpc2Request {
		return {
			jsonrpc: JSON_RPC_VERSION,
			method: "DELETE_DOCUMENT",
			id,
			params: {
				docRef,
				// Data Services requires only the language
				locale: locale.language
			}
		};
	},

	addLink(linkRef: Relationship.LinkRef, linkDocument?: object): RelationshipJsonRpc2request.AddLinkJsonRpc2request {
		return {
			jsonrpc: JSON_RPC_VERSION,
			id: linkRef.id,
			method: "ADD_LINK",
			params: { linkDescriptor: linkRef.linkDescriptor, linkDocument }
		};
	},

	modifyLink(
		linkRef: Relationship.LinkRef,
		linkDocument?: object
	): RelationshipJsonRpc2request.ModifyLinkJsonRpc2request {
		return {
			jsonrpc: JSON_RPC_VERSION,
			id: linkRef.id,
			method: "MODIFY_LINK",
			params: { linkRef, linkDocument }
		};
	},

	deleteLink(linkRef: Relationship.LinkRef): RelationshipJsonRpc2request.DeleteLinkJsonRpc2request {
		return {
			jsonrpc: JSON_RPC_VERSION,
			id: linkRef.id,
			method: "DELETE_LINK",
			params: { linkRef }
		};
	},
	/**
	 * Loads *all* thumbnail urls for all attachments that are referenced in
	 * the result set of the previous rpc operation.
	 */
	loadAllThumbnailURLs(): LoadThumbnailUrlsJsonRpc2.Request {
		return {
			jsonrpc: JSON_RPC_VERSION,
			id: `loadurls-${requestCounter++}`,
			method: "LOAD_THUMBNAIL_URLS_INTERNAL",
			params: {}
		};
	},

	query<QueryRoot extends Query.QueryRoot>(id: string, query: QueryRoot): QueryJsonRpc2Request<QueryRoot> {
		return {
			jsonrpc: JSON_RPC_VERSION,
			method: "QUERY",
			id,
			params: { query }
		};
	}
};
