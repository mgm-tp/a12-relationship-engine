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

import type { LocalizerContextProps } from "@com.mgmtp.a12.utils/utils-localization-react";
import {
	type Locale,
	type Localizer,
	type Localizable,
	defaultDataFormats,
	defaultValueConversion,
	defaultLocalizerFactory
} from "@com.mgmtp.a12.utils/utils-localization";

export const US_LOCALE: Locale = { language: "en", country: "US" };

export const US_LOCALIZER_CTX = {
	locale: US_LOCALE,
	dataFormats: defaultDataFormats(US_LOCALE),
	localizer: defaultLocalizerFactory({
		locale: US_LOCALE,
		dataFormats: defaultDataFormats(US_LOCALE)
	}),
	conversion: defaultValueConversion(defaultDataFormats(US_LOCALE))
};

export const DE_LOCALE: Locale = { language: "de", country: "DE" };

export const DE_LOCALIZER_CTX: LocalizerContextProps = {
	locale: DE_LOCALE,
	dataFormats: defaultDataFormats(DE_LOCALE),
	localizer: defaultLocalizerFactory({
		locale: DE_LOCALE,
		dataFormats: defaultDataFormats(DE_LOCALE)
	}),
	conversion: defaultValueConversion(defaultDataFormats(DE_LOCALE))
};

export const KEY_OUTPUT_LOCALIZER: Localizer = (...localizables: Localizable[]) => localizables[0].key;

export const KEY_OUTPUT_LOCALIZER_CONTEXT = {
	locale: US_LOCALE,
	dataFormats: defaultDataFormats(US_LOCALE),
	localizer: KEY_OUTPUT_LOCALIZER
};
