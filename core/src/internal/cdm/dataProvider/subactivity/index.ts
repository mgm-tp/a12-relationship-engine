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
 * @module cdm/data-provider
 * @experimental
 */

/**
 * This module is concerned with the handling of data between CDM parent and sub
 * activities.
 *
 * In this case, a parent activity is a top level, CDM-based activity that is
 * configured to derive child activities for specific document creation or
 * modification operations.
 *
 * This configuration is part of the Relationship UI Binding ("Binding Config")
 * that is embedded in the form model of the parent activity.
 *
 * The configuration defines which relationship UI components should create sub
 * activities for add and/or edit operations on linked documents.
 *
 * A sub activity is a child activity that is created for the purpose of either
 * - creating a new document and linking it to a document in the parent activity
 * or
 * - editing an existing, linked document of the parent activity
 * in a separate activity.
 *
 * A sub activity is usually not used to persist any of the modifications to its
 * data. Its data is rather replacing the data of the parent activity on save.
 *
 * Sub activities can, but must not, be CDM-based activities themselves.
 *
 */
export const EXPERIMENTAL = true;
