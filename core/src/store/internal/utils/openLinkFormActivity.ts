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

import { ActivityActions } from "@com.mgmtp.a12.client/client-core";
import type { FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import { NEW_INSTANCE_IDENTIFIER } from "@com.mgmtp.a12.client/client-core";
import type { DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { FormActivity } from "@com.mgmtp.a12.formengine/formengine-core";
import { THUMBNAIL_SLICE } from "@com.mgmtp.a12.client/client-core/a12internal";

import { ensureDynamicLinkFormModule } from "./dynamicLinkFormModule.js";

/** @internal */
export interface OpenLinkFormActivityParams {
	readonly activityId: string;
	readonly formModel: FormModel;
	readonly documentModel: DocumentModel;
	readonly sourceDocRef: string;
	readonly sourceRole: string;
	readonly relationshipName: string;
	readonly targetDocRef: string;
	readonly targetRole: string;
	/** For edit: existing link ID. Absence indicates a new link. */
	readonly linkId?: string;
	/** For edit: existing link document reference. */
	readonly linkDocRef?: string;
	/** For edit: existing link document data. */
	readonly linkDocument?: object;
	/** Group path for grouped relationships (serialized). */
	readonly groupPath?: string;
	/** Mark as single-selection for post-add cleanup. */
	readonly singleSelection?: boolean;
	/** Parent activity thumbnail slice, propagated to the child default data holder. */
	readonly thumbnails?: Record<string, string>;
}

/**
 * Builds an `ActivityActions.create` action for opening a link form sub-activity.
 * Usable from both middleware (`store.dispatch`) and sagas (`yield* put`).
 *
 * @remarks Also registers the dynamic link form module as a side-effect.
 * @internal
 */
export function buildOpenLinkFormAction(params: OpenLinkFormActivityParams): ReturnType<typeof ActivityActions.create> {
	const { formModel, documentModel, linkId, linkDocRef, linkDocument, groupPath, singleSelection, thumbnails } = params;

	ensureDynamicLinkFormModule({
		linkFormModel: formModel.header.id,
		linkDocumentModel: documentModel.header.id
	});

	const isEdit = linkId !== undefined;

	const document: FormActivity.Data.SingleDocumentData["document"] = linkDocument
		? { ...linkDocument, id: linkDocRef ?? NEW_INSTANCE_IDENTIFIER, modelId: documentModel.header.id }
		: { id: NEW_INSTANCE_IDENTIFIER, modelId: documentModel.header.id };

	return ActivityActions.create({
		activityDescriptor: {
			model: documentModel.header.id,
			instance: isEdit ? (linkDocRef ?? linkId) : NEW_INSTANCE_IDENTIFIER,
			dynamicLinkForm: "true",
			sourceDocRef: params.sourceDocRef,
			sourceRole: params.sourceRole,
			relationshipName: params.relationshipName,
			targetDocRef: params.targetDocRef,
			targetRole: params.targetRole,
			...(isEdit ? { selectedLinkId: linkId } : {}),
			...(linkDocRef ? { linkDocRef } : {}),
			...(groupPath ? { groupPath } : {}),
			...(singleSelection ? { singleSelection: "true" } : {})
		},
		initiatingActivityId: params.activityId,
		data: { document } satisfies FormActivity.Data.SingleDocumentData,
		loadingState: "loaded",
		slices: { [THUMBNAIL_SLICE]: thumbnails }
	});
}
