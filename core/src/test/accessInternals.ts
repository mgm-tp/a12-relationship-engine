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

// hack to make code accessible that was marked "internal"
//
// The @internal annotation only removes the types from the generated .d.ts files.
// Functions are still present in the compiled .js files, and can be used freely.
// But since the ts compiler can not find type definitions, there will be a compile error.
// To fix this, we declare the module here.
// To get (semi-)correct typings, we import the types from the packaged source (!) folders.

// import type * as C1 from "@com.mgmtp.a12.client/client-core/src/core/model/internal/expandDescriptors.js";

// declare module "@com.mgmtp.a12.client/client-core/lib/core/model/internal/expandDescriptors.js" {
// 	export const expandDescriptors: typeof C1.expandDescriptors;
// }
