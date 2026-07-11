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

export type { Lens } from "@com.mgmtp.a12.client/client-core";

import type { Lens } from "@com.mgmtp.a12.client/client-core";

/** @internal */
export function atKey<V>(key: string, fallback: V): Lens<Partial<Record<string, V>>, V> {
	return {
		get: (record) => record[key] ?? fallback,
		set: (value) => (record) => ({ ...record, [key]: value })
	};
}

/** @internal */
export function compose<S, A, B>(a: Lens<S, A>, b: Lens<A, B>): Lens<S, B>;
/** @internal */
export function compose<S, A, B, C>(a: Lens<S, A>, b: Lens<A, B>, c: Lens<B, C>): Lens<S, C>;
/** @internal */
export function compose<S, A, B, C, D>(a: Lens<S, A>, b: Lens<A, B>, c: Lens<B, C>, d: Lens<C, D>): Lens<S, D>;
/** @internal */
export function compose<S, A, B, C, D, E>(
	a: Lens<S, A>,
	b: Lens<A, B>,
	c: Lens<B, C>,
	d: Lens<C, D>,
	e: Lens<D, E>
): Lens<S, E>;
/** @internal */
export function compose(...lenses: Lens<unknown, unknown>[]): Lens<unknown, unknown> {
	return lenses.reduce((outer, inner) => ({
		get: (s: unknown) => inner.get(outer.get(s)),
		set: (b: unknown) => (s: unknown) => outer.set(inner.set(b)(outer.get(s)))(s)
	}));
}

/** @internal */
export function pipe<T>(value: T, ...transforms: Array<(input: T) => T>): T {
	return transforms.reduce((current, transform) => transform(current), value);
}
