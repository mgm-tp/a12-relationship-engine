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

import type { ActivityReducers } from "@com.mgmtp.a12.client/client-core";

import { RelationshipEngineActions } from "../actions.js";

import { handleSeedChangelog } from "./seedChangelog.js";
import { handleSetThumbnails } from "./setThumbnails.js";
import { handleSetDataHolders } from "./setDataHolders.js";
import { handleMergeChangelog } from "./mergeChangelog.js";
import { handleSetDialogState } from "./setDialogState.js";
import { handleInitDataHolders } from "./initDataHolders.js";
import { handleSetPreProcessed } from "./setPreProcessed.js";
import { handleSetDataHolderSourceEntities } from "./setSourceEntity.js";
import { handleAddChangelog, handleAddChangelogs } from "./addChangeLog.js";
import { handleTrackDraftingDocumentRow } from "./trackDraftingDocumentRow.js";
import { handleClearDraftingDocumentRow } from "./clearDraftingDocumentRow.js";
import { handlePushChangelogCheckpoint, handleResolveChangelogCheckpoint } from "./changelogCheckpoint.js";
import { handleLoadSubDocumentGraphsDone, handleLoadSubDocumentGraphsFailed } from "./loadSubDocumentGraphs.js";
import { handleSetDropdownData, handleSetDropdownLoading, handleSetDropdownSearchState } from "./dropdownSelection.js";

/** @internal */
export const RelationshipEngineDataReducers: ActivityReducers.DataReducer[] = [
	{
		reduce(dataHolders, action, defaultDataHolder) {
			return RelationshipEngineActions.Commands.initDataHolders.match(action)
				? handleInitDataHolders(dataHolders, action, defaultDataHolder)
				: dataHolders;
		}
	},
	{
		reduce(dataHolders, action, defaultDataHolder) {
			if (!defaultDataHolder) {
				return dataHolders;
			}

			if (RelationshipEngineActions.Commands.addChangeLog.match(action)) {
				return handleAddChangelog(dataHolders, action, defaultDataHolder);
			}

			if (RelationshipEngineActions.Commands.addChangeLogs.match(action)) {
				return handleAddChangelogs(dataHolders, action, defaultDataHolder);
			}

			return dataHolders;
		}
	},
	{
		reduce(dataHolders, action) {
			return RelationshipEngineActions.Commands.setDataHolders.match(action)
				? handleSetDataHolders(dataHolders, action)
				: dataHolders;
		}
	},
	{
		reduce(dataHolders, action) {
			return RelationshipEngineActions.Commands.setThumbnails.match(action)
				? handleSetThumbnails(dataHolders, action)
				: dataHolders;
		}
	},
	{
		reduce(dataHolders, action) {
			return RelationshipEngineActions.Commands.setSourceEntities.match(action)
				? handleSetDataHolderSourceEntities(dataHolders, action)
				: dataHolders;
		}
	},
	{
		reduce(dataHolders, action) {
			return RelationshipEngineActions.Commands.seedChangelog.match(action)
				? handleSeedChangelog(dataHolders, action)
				: dataHolders;
		}
	},
	{
		reduce(dataHolders, action, defaultDataHolder) {
			return RelationshipEngineActions.Commands.mergeChangelog.match(action)
				? handleMergeChangelog(dataHolders, action, defaultDataHolder)
				: dataHolders;
		}
	},
	{
		reduce(dataHolders, action, defaultDataHolder) {
			if (RelationshipEngineActions.Commands.pushChangelogCheckpoint.match(action)) {
				return handlePushChangelogCheckpoint(dataHolders, action);
			}

			if (RelationshipEngineActions.Commands.resolveChangelogCheckpoint.match(action)) {
				return handleResolveChangelogCheckpoint(dataHolders, action, defaultDataHolder);
			}

			return dataHolders;
		}
	},
	{
		reduce(dataHolders, action, defaultDataHolder) {
			return RelationshipEngineActions.Commands.setDialogState.match(action)
				? handleSetDialogState(dataHolders, action, defaultDataHolder)
				: dataHolders;
		}
	},
	{
		reduce(dataHolders, action) {
			return RelationshipEngineActions.Commands.setDropdownData.match(action)
				? handleSetDropdownData(dataHolders, action)
				: dataHolders;
		}
	},
	{
		reduce(dataHolders, action) {
			return RelationshipEngineActions.Commands.setDropdownLoading.match(action)
				? handleSetDropdownLoading(dataHolders, action)
				: dataHolders;
		}
	},
	{
		reduce(dataHolders, action) {
			return RelationshipEngineActions.Commands.setDropdownSearchState.match(action)
				? handleSetDropdownSearchState(dataHolders, action)
				: dataHolders;
		}
	},
	{
		reduce(dataHolders, action) {
			return RelationshipEngineActions.Commands.trackDraftingDocumentRow.match(action)
				? handleTrackDraftingDocumentRow(dataHolders, action)
				: dataHolders;
		}
	},
	{
		reduce(dataHolders, action) {
			return RelationshipEngineActions.Commands.clearDraftingDocumentRow.match(action)
				? handleClearDraftingDocumentRow(dataHolders, action)
				: dataHolders;
		}
	},
	{
		reduce(dataHolders, action) {
			return RelationshipEngineActions.Commands.setPreProcessed.match(action)
				? handleSetPreProcessed(dataHolders, action)
				: dataHolders;
		}
	},
	{
		reduce(dataHolders, action) {
			if (RelationshipEngineActions.Commands.loadSubDocumentGraphs.done.match(action)) {
				return handleLoadSubDocumentGraphsDone(dataHolders, action);
			}

			if (RelationshipEngineActions.Commands.loadSubDocumentGraphs.failed.match(action)) {
				return handleLoadSubDocumentGraphsFailed(dataHolders);
			}

			return dataHolders;
		}
	}
];
