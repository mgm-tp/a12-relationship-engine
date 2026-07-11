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

import type {
	JsonRpc2Request,
	QueryJsonRpc2Request,
	DocumentJsonRpc2Request
} from "@com.mgmtp.a12.dataservices/dataservices-access";

export interface BaseUrlOption {
	baseUrl: string;
}

export const BaseUrlOption = {
	baseUrl: {
		alias: "url",
		description: "Base url of the Services",
		default: "http://localhost:17090"
	}
};

export interface PresetsOption {
	presets: string[] | string;
}

export const PresetsOption = {
	default: "all",
	choices: ["all", "relationship", "cdm"],
	array: true,
	type: "string"
} as const;

export interface RequestsCreator {
	(): JsonRpc2Request[];
}

export type PresetMap<T> = Record<string, T[] | undefined>;

export function resolvePresets<T>(params: PresetsOption & { presetMap: PresetMap<T> }): T[] {
	const { presets, presetMap } = params;

	const presetList = Array.isArray(presets) ? presets : [presets];
	const result = new Set<T>();

	presetList.forEach((preset) => presetMap[preset]?.forEach((values) => result.add(values)));

	if (presetList.includes("all")) {
		Object.values(presetMap).forEach((values) => values?.forEach((value) => result.add(value)));
	}

	return [...result];
}

export function listDocuments(documentModel: string, limit = 9999): QueryJsonRpc2Request {
	return {
		jsonrpc: "2.0",
		id: `ListDocuments${documentModel}`,
		method: "QUERY",
		params: {
			query: {
				projectionName: "document",
				targetDocumentModel: documentModel,
				sort: [],
				paging: { pageSize: limit, pageNumber: 0 }
			}
		}
	};
}

export function deleteDocument(docRef: string): DocumentJsonRpc2Request.DeleteJsonRpc2Request {
	return {
		jsonrpc: "2.0",
		id: `DELETE_DOCUMENT/${docRef}`,
		method: "DELETE_DOCUMENT",
		params: { locale: "en_US", docRef }
	};
}
