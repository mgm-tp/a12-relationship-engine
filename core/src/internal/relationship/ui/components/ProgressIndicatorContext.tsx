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

import * as React from "react";

import { type Container, createContext, useContextSelector } from "@com.mgmtp.a12.widgets/widgets-core";

export namespace ProgressIndicatorContextProvider {
	export interface Props extends Container, ProgressIndicatorContext.Type {}
}

export const ProgressIndicatorContextProvider: React.FC<ProgressIndicatorContextProvider.Props> = React.memo(
	function ProgressIndicatorContextProvider(props) {
		const { children, ...rest } = props;

		return <ProgressIndicatorContext.Provider value={rest}>{children}</ProgressIndicatorContext.Provider>;
	}
);

const ProgressIndicatorContext = createContext<ProgressIndicatorContext.Type>({});
ProgressIndicatorContext.displayName = "ProgressIndicatorContext";

export namespace ProgressIndicatorContext {
	export interface Type {
		/**
		 * Defines the key of the label used for the progress indicator
		 */
		readonly progressIndicatorLabelKey?: string;

		/**
		 * Defines the delay before a loading indicator appears
		 */
		readonly progressIndicatorDelay?: number;

		/**
		 * Disables that the progress indicator appears fast
		 */
		readonly progressIndicatorDisableFastAppear?: boolean;
	}
}

export function useProgressIndicatorContext<T>(selector: (context: ProgressIndicatorContext.Type) => T) {
	return useContextSelector(ProgressIndicatorContext, selector);
}
