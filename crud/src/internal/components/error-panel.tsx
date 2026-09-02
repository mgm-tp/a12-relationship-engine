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

import React, { useContext } from "react";
import { useSelector } from "react-redux";

import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import type { Localizer } from "@com.mgmtp.a12.utils/utils-localization";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react";
import { Relationship } from "@com.mgmtp.a12.relationshipengine/relationshipengine-core";
import { Icon, List, MessageBox, TextOutput } from "@com.mgmtp.a12.widgets/widgets-core";
import { JsonRpc2Response, type JsonRpc2ResponseError } from "@com.mgmtp.a12.dataservices/dataservices-access";

/** @internal */
export function ErrorPanel({ activityId }: { activityId: string }): React.ReactNode {
	const activityError = useSelector(ActivitySelectors.error(activityId));

	if (!activityError) {
		return null;
	}

	if (activityError.errorCode === "INTERNAL_CLIENT_ERROR") {
		return <MessageBox variant="error" label={activityError.message} icon={<Icon>error</Icon>} />;
	} else if (activityError.errorCode === "SAVING_FAILED_ERROR") {
		const serverErrors = toServerErrors(activityError.content);

		return serverErrors.length > 0 ? <ServerErrorPanel serverErrors={serverErrors} /> : null;
	} else if (Relationship.Error.ServerError.isInstance(activityError)) {
		return <ServerErrorPanel serverErrors={(activityError as Relationship.Error.ServerError).errors} />;
	} else {
		return null;
	}
}

/** @internal */
export function toServerErrors(content: unknown): JsonRpc2ResponseError[] {
	const candidates = Array.isArray(content) ? content : [content];

	return candidates.filter(JsonRpc2Response.error.isInstance);
}

function ServerErrorPanel({ serverErrors }: { serverErrors: JsonRpc2ResponseError[] }): React.ReactNode {
	const allErrors = serverErrors.map((x) => x.error.data).filter(JsonRpc2Response.Exception.isInstance);
	const errors = allErrors.filter((error) => error.level === "ERROR");
	const warnings = allErrors.filter((error) => error.level === "WARNING");
	const infos = allErrors.filter((error) => error.level === "INFO" || error.level === "DEBUG");
	const messageBoxes: React.ReactNode[] = [];

	if (errors.length > 0) {
		messageBoxes.push(<ServerErrorBox type="error" exceptions={errors} key="error" />);
	}

	if (warnings.length > 0) {
		messageBoxes.push(<ServerErrorBox type="warning" exceptions={warnings} key="warning" />);
	}

	if (infos.length > 0) {
		messageBoxes.push(<ServerErrorBox type="info" exceptions={infos} key="info" />);
	}

	return <>{messageBoxes}</>;
}

function ServerErrorBox({
	exceptions,
	type
}: {
	exceptions: JsonRpc2Response.Exception[];
	type: "error" | "warning" | "info";
}): React.ReactNode {
	const localizer = useContext(LocalizerContext).localizer;
	const messages = exceptions.map(convertToMessage(localizer));
	let content: React.ReactNode;
	let label: React.ReactNode | string | undefined;

	if (messages.length === 1) {
		label = messages[0];
		content = null;
	} else {
		label = type[0].toUpperCase() + type.substring(1);
		content = (
			<List>
				{messages.map((message, index) => (
					<List.Item text={message} key={index} />
				))}
			</List>
		);
	}

	return (
		<MessageBox label={label} variant={type} icon={<Icon>error</Icon>}>
			{content}
		</MessageBox>
	);
}

const convertToMessage = (localizer: Localizer) => (error: JsonRpc2Response.Exception) => {
	const title = localizer({ key: error.title.key, defaults: { en: error.title.default } });
	const description = localizer({
		key: error.description.key,
		defaults: { en: error.description.default }
	});

	return <TextOutput label={title}>{description}</TextOutput>;
};
