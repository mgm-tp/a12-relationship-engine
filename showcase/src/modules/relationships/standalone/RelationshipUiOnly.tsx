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

import React from "react";
import { connect, useSelector } from "react-redux";

import { ActivityActions, ActivitySelectors, Model, type View } from "@com.mgmtp.a12.client/client-core";
import { FormActivity } from "@com.mgmtp.a12.formengine/formengine-core";
import { Relationship, RelationshipViews } from "@com.mgmtp.a12.relationshipengine/relationshipengine-core";
import { Button, ActionContentbox, ContentBoxElements } from "@com.mgmtp.a12.widgets/widgets-core";

interface DispatchProps {
	cancel(): void;
	apply(): void;
}

export function RelationshipUiOnly({
	activityId,
	cancel,
	apply,
	configuration,
	ariaLevel
}: DispatchProps & View): React.ReactNode {
	const data = useSelector(ActivitySelectors.data(activityId));
	const loadingState = useSelector(ActivitySelectors.loadingStateById(activityId));

	if (!FormActivity.Data.SingleDocumentData.isInstance(data)) {
		return null;
	}

	if (loadingState !== "loaded") {
		return null;
	}

	if (configuration === undefined) {
		return null;
	}

	const elementIds = [];
	const { bindings = [] }: { readonly bindings?: object[] } = configuration || {};
	for (const binding of bindings) {
		if (Model.Binding.isInstance(binding) && Relationship.UiConfigurationBinding.isInstance(binding)) {
			elementIds.push(binding.elementId);
		}
	}

	if (elementIds.length === 0) {
		return null;
	}

	return (
		<ActionContentbox
			padding="24px"
			headingElements={<ContentBoxElements.Title key="title" text="Standalone Relationship UI" ariaLevel={ariaLevel} />}
			buttons={[
				{
					align: "right",
					button: <Button id="Cancel" key="Cancel" label="Cancel" active destructive secondary onClick={cancel} />
				},
				{
					align: "right",
					button: <Button id="Submit" key="Submit" label="Submit" active destructive primary onClick={apply} />
				}
			]}>
			<p>
				This examples demonstrates the usage of a plain Relationship Engine. It is not integrated into a Form Engine
				container. The UI is configured directly in the application model.
			</p>
			{elementIds.map((instanceId, index) => (
				<RelationshipViews.RelationshipEngine
					activityId={activityId}
					instanceId={instanceId}
					disabled={false}
					key={index}
				/>
			))}
		</ActionContentbox>
	);
}

const ConnectedRelationshipUiOnly = connect<{}, DispatchProps, View>(
	undefined,
	function mapDispatchToProps(dispatch, { activityId }) {
		return {
			apply() {
				dispatch(ActivityActions.commit.started({ activityId }));
			},
			cancel() {
				dispatch(ActivityActions.cancelRequested({ activityIds: [activityId] }));
			}
		};
	}
)(RelationshipUiOnly);

export default ConnectedRelationshipUiOnly;
