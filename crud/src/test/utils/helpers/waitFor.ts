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

import type { Store, UnknownAction } from "redux";

import { observeStore } from "./observeStore.js";

interface Options {
	timeout?: number;
}

export type WaitForFunc = (assertCallback: (state: object) => void, options?: Options) => Promise<boolean>;

export function waitForWithStore(store: Store<object, UnknownAction>): WaitForFunc {
	return function waitFor(assertCallback, options = {}) {
		return new Promise((resolve, reject) => {
			let lastError: unknown;
			const { timeout = 4500 } = options;
			const timer = setTimeout(onTimeout, timeout);
			const unsubscribe = observeStore({ store, onChange });

			function onDone({ result, error }: { result?: boolean; error?: unknown }): void {
				clearTimeout(timer);
				setImmediate(() => {
					unsubscribe();
				});

				if (result) {
					resolve(result);
				} else {
					reject(error);
				}
			}

			function onChange(currentState: object): void {
				try {
					assertCallback(currentState);
					onDone({ result: true });
				} catch (error) {
					lastError = error;
				}
			}

			function onTimeout() {
				onDone({
					error: lastError || new Error("Timed out in waitForElement.")
				});
			}

			onChange(store.getState());
		});
	};
}
