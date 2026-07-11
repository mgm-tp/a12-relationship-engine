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
import React, { useContext } from "react";

import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react";
import { addPrefix, ProgressIndicator as BaseProgressIndicator } from "@com.mgmtp.a12.widgets/widgets-core";

import { useProgressIndicatorContext } from "./ProgressIndicatorContext.js";

/** @internal */
export interface ProgressIndicatorProps {
	readonly variant: "transparent" | "bright";
	readonly height?: string | number;
}

/** @internal */
export function ProgressIndicator(props: ProgressIndicatorProps): React.ReactNode {
	const localizer = useContext(LocalizerContext).localizer;
	const progressIndicatorLabelKey = useProgressIndicatorContext((context) => context.progressIndicatorLabelKey);
	const progressIndicatorDelay = useProgressIndicatorContext((context) => context.progressIndicatorDelay);
	const progressIndicatorDisableFastAppear = useProgressIndicatorContext(
		(context) => context.progressIndicatorDisableFastAppear
	);

	const indicator = (
		<BaseProgressIndicator
			type="horizontal"
			outerOverlayVariant={props.variant}
			innerOverlayVariant={props.variant}
			label={progressIndicatorLabelKey ? localizer({ key: progressIndicatorLabelKey }) : undefined}
			fastAppear={!progressIndicatorDisableFastAppear}
			openingDelay={progressIndicatorDelay}
		/>
	);

	return props.height ? (
		<div style={{ height: props.height }} className={addPrefix(`-u-width-full`)}>
			{indicator}
		</div>
	) : (
		indicator
	);
}
