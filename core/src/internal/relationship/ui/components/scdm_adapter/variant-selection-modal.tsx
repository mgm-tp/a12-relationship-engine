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
 * @experimental
 */
import React, { useContext } from "react";

import {
	defaultVariantSelectionMapper,
	VariantSelection,
	type VariantSelectionItem
} from "@com.mgmtp.a12.client/client-core/heterogeneity";
import { type ModelGraph, type RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type Localizer } from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react/lib/main/index.js";
import { Button, ActionContentbox, ContentBoxElements, Icon, ModalOverlay } from "@com.mgmtp.a12.widgets/widgets-core";

import { assertObject } from "../../../../shared/assertion.js";
import { getEntityByRole } from "../../../../cdm/commons/relationshipModelUtils.js";
import { descriptorVariantSelectionTitle } from "../../../../cdm/languages/localization.js";

/** @internal */
export function VariantSelectionModal(props: {
	variantSelectionItems: VariantSelectionItem[];
	onClose(): void;
	onVariantSelected(modelName: string): void;
}): React.ReactNode {
	const localizer = useContext(LocalizerContext).localizer;
	const title = localizer(descriptorVariantSelectionTitle());

	return (
		<ModalOverlay closeOnEsc closeOnOutsideClick onClose={props.onClose}>
			<ActionContentbox
				headingElements={<ContentBoxElements.Title text={title} ariaLevel={1} />}
				headingButtons={[
					<ContentBoxElements.HeadingAddon key="cancel">
						<Button onClick={props.onClose} icon={<Icon>close</Icon>} invert />
					</ContentBoxElements.HeadingAddon>
				]}>
				<VariantSelection
					variants={props.variantSelectionItems}
					onSelect={(dataModel) => {
						props.onClose();
						props.onVariantSelected(dataModel);
					}}
				/>
			</ActionContentbox>
		</ModalOverlay>
	);
}

/** @internal */
export function calculateVariantSelectionItems(
	modelGraph: ModelGraph,
	localizer: Localizer,
	relationshipModel?: RelationshipModel,
	targetRole?: string
): VariantSelectionItem[] {
	if (relationshipModel && targetRole) {
		const targetEntity = getEntityByRole(relationshipModel, targetRole);
		if (!targetEntity) {
			return [];
		}
		const targetModel = modelGraph.documentModels.find((dm) => dm.modelId === targetEntity.documentModel);
		assertObject(targetModel);
		const result = defaultVariantSelectionMapper(modelGraph, localizer)(targetModel);
		return result;
	} else {
		return [];
	}
}
