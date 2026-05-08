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

import type * as TypeMoq from "typemoq";

/**
 * Turns a mock into a "thenable" to ensure promises get resolved correctly
 * (see https://github.com/florinn/typemoq/issues/66)
 */
export function thenable<T>(mock: TypeMoq.IMock<T>): void {
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	mock.setup((x) => (x as T & { then: void }).then).returns(() => undefined);
}

export interface RemotePromise<T = undefined> {
	readonly promise: Promise<T>;
	resolve(value: T | PromiseLike<T>): void;
	reject(reason?: unknown): void;
}

export function createRemotePromise<T>(): RemotePromise<T> {
	let resolve: (value: T | PromiseLike<T>) => void = () => {};
	let reject: (result?: T) => void = () => {};

	const promise = new Promise<T>((resolveClb, rejectClb) => {
		resolve = resolveClb;
		reject = rejectClb;
	});

	// Prevent unwanted console logs of unhandled promise rejections.
	promise.catch(() => {});

	return { promise, resolve: resolve, reject: reject };
}
