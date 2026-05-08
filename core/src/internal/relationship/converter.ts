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

import { ModelPath } from "@com.mgmtp.a12.base/base-model-api/lib/main/model/index.js";
import { DocumentModel, DocumentServiceFactory, type FieldInstanceValue } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import { type ValueConversion } from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";

/** @internal */
export interface Converter {
	formatValue(modelPath: ModelPath, value: FieldInstanceValue | object): string;
}

const documentServiceFactory = new DocumentServiceFactory();

/** @internal */
export function createConverter(conversion: ValueConversion, documentModel: DocumentModel): Converter {
	const dmSearchService = documentServiceFactory.getDocumentModelSearchService(documentModel);

	return {
		formatValue: (modelPath, value) => {
			const element = dmSearchService.getByPath(modelPath);

			if (element?.type === "Field" && isFieldInstanceValue(value)) {
				const fieldType = element.fieldType.type;

				if (isLocalizableFieldType(fieldType)) {
					throw new Error(`The element ${ModelPath.toString(modelPath)} should be formatted by a localizer`);
				}

				if (isFormattableFieldType(fieldType)) {
					const conversionConfig = DocumentModel.extractConversionConfig(
						element.fieldType,
						documentModel.content.modelConfig.timeZone,
						documentModel.content.modelInfo.baseYear
					);

					return (
						conversion.formatValue(value, {
							...conversionConfig,
							modelPath,
							modelId: documentModel.header.id
						}) ?? ""
					);
				}
			}

			throw new Error(`The element ${ModelPath.toString(modelPath)} is not a valid element to be formatted!`);
		}
	};
}

function isFieldInstanceValue(o: unknown): o is FieldInstanceValue {
	return (
		o === null ||
		typeof o === "string" ||
		typeof o === "number" ||
		typeof o === "boolean" ||
		o instanceof Date ||
		(Array.isArray(o) && o.every((i) => i instanceof Date))
	);
}

function isLocalizableFieldType(fieldType: string): boolean {
	return ["BooleanType", "ConfirmType", "EnumerationType"].includes(fieldType);
}

function isFormattableFieldType(fieldType: string): boolean {
	return [
		"NumberType",
		"DateType",
		"DateTimeType",
		"TimeType",
		"DateFragmentType",
		"DateRangeType",
		"StringType",
		"CustomFieldType"
	].includes(fieldType);
}
