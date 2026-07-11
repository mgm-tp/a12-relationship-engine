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
 * Resolves the base URL for the deprecated (pre-rework) showcase entry.
 *
 * - Local rsbuild dev server serves it at the root: `/`
 * - Jenkins docker image (nginx) serves it under `/app/`
 *
 * Override the entry path with the `DEPRECATED_BASE_ENTRY` env var
 * (set by `build.gradle` for the docker-based CI run).
 */
const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:17000";
const DEPRECATED_BASE_ENTRY = process.env.DEPRECATED_BASE_ENTRY ?? "";

export const DEPRECATED_APP_URL = `${BASE_URL}/${DEPRECATED_BASE_ENTRY}`;
