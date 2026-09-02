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
import { test, expect, describe } from "vitest";
import { render } from "@testing-library/react";

import type { Relationship as RelationshipServerApi } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { LocalizerContext, type LocalizerContextProps } from "@com.mgmtp.a12.utils/utils-localization-react";
import { type Locale, defaultDataFormats, defaultValueConversion } from "@com.mgmtp.a12.utils/utils-localization";

import { TestWrapper } from "../../../../../utils/rtl/testWrapper.js";
import { getMockModels } from "../../../../../mocks/relationships/mocks.js";
import type { Items } from "../../../../../../internal/relationship/ui/components/adapter/adapter.js";
import type { SingleSelectionProps } from "../../../../../../internal/relationship/ui/components/api.js";
import type { Relationship as RelationshipClientApi } from "../../../../../../internal/relationship/relationship.js";
import type { AdapterLink } from "../../../../../../internal/relationship/ui/components/adapter/adapterLinkSelectors.js";
import {
	areStatePropsEqual,
	SingleSelectionWrapper
} from "../../../../../../internal/relationship/ui/components/adapter/SingleSelection.js";

type WrapperProps = Parameters<typeof SingleSelectionWrapper>[0];
type StateProps = Parameters<typeof areStatePropsEqual>[0];

const capturedTemplateProps: SingleSelectionProps[] = [];

function CapturingTemplate(props: SingleSelectionProps): null {
	capturedTemplateProps.push(props);

	return null;
}

describe("com.mgmtp.a12.relationshipengine-core.relationship-engine.SingleSelectionWrapper", () => {
	describe("selectedItem identity", () => {
		test("stays referentially stable across renders when linkRef.id is unchanged, even with a new links array reference", () => {
			capturedTemplateProps.length = 0;

			const { rerender } = renderWrapper(createWrapperProps({ links: createLoadedLinks("link-1", "doc/1") }));
			rerender(<Wrapped {...createWrapperProps({ links: createLoadedLinks("link-1", "doc/1") })} />);

			expect(capturedTemplateProps).toHaveLength(2);
			expect(capturedTemplateProps[1].selectedItem).toBe(capturedTemplateProps[0].selectedItem);
		});

		test("changes identity and content when the underlying link actually changes", () => {
			capturedTemplateProps.length = 0;

			const { rerender } = renderWrapper(createWrapperProps({ links: createLoadedLinks("link-1", "doc/1") }));
			rerender(<Wrapped {...createWrapperProps({ links: createLoadedLinks("link-2", "doc/2") })} />);

			expect(capturedTemplateProps[1].selectedItem).not.toBe(capturedTemplateProps[0].selectedItem);
			expect(capturedTemplateProps[1].selectedItem).toMatchObject({
				loadingState: "loaded",
				data: { docRef: "doc/2" }
			});
		});

		test("returns undefined stably for an empty (loaded) links list across renders", () => {
			capturedTemplateProps.length = 0;

			const { rerender } = renderWrapper(createWrapperProps({ links: { loadingState: "loaded", data: [] } }));
			rerender(<Wrapped {...createWrapperProps({ links: { loadingState: "loaded", data: [] } })} />);

			expect(capturedTemplateProps[0].selectedItem).toMatchObject({ loadingState: "loaded", data: undefined });
			expect(capturedTemplateProps[1].selectedItem).toBe(capturedTemplateProps[0].selectedItem);
		});

		test("recomputes the label once linkModels finishes loading for the same already-loaded link", () => {
			capturedTemplateProps.length = 0;

			const links = createLoadedLinks("link-1", "doc/1", { g1: { stringField: "Loaded Label" } });
			const loadedLinkModels = getMockModels({ id: "1", elementRef: "stringField", width: 1 });

			const { rerender } = renderWrapper(createWrapperProps({ links, linkModels: { loadingState: "missing" } }));
			rerender(<Wrapped {...createWrapperProps({ links, linkModels: loadedLinkModels })} />);

			expect(capturedTemplateProps[0].selectedItem).toMatchObject({ loadingState: "loaded", data: { label: "" } });
			expect(capturedTemplateProps[1].selectedItem).toMatchObject({
				loadingState: "loaded",
				data: { label: "Loaded Label" }
			});
			expect(capturedTemplateProps[1].selectedItem).not.toBe(capturedTemplateProps[0].selectedItem);
		});

		test("recomputes the label when the document graph settles the link's document content while linkRef.id, targetRole and linkModels.loadingState stay unchanged", () => {
			capturedTemplateProps.length = 0;

			const loadedLinkModels = getMockModels({ id: "1", elementRef: "stringField", width: 1 });
			const unsettledLinks = createLoadedLinks("link-1", "doc/1", {});
			const settledLinks = createLoadedLinks("link-1", "doc/1", { g1: { stringField: "Markt" } });

			const { rerender } = renderWrapper(createWrapperProps({ links: unsettledLinks, linkModels: loadedLinkModels }));
			rerender(<Wrapped {...createWrapperProps({ links: settledLinks, linkModels: loadedLinkModels })} />);

			expect(capturedTemplateProps[0].selectedItem).toMatchObject({ loadingState: "loaded", data: { label: "" } });
			expect(capturedTemplateProps[1].selectedItem).toMatchObject({
				loadingState: "loaded",
				data: { label: "Markt" }
			});
			expect(capturedTemplateProps[1].selectedItem).not.toBe(capturedTemplateProps[0].selectedItem);
		});

		test("recomputes the label when only the localizer context changes, with linkRef.id, document and linkModels.loadingState unchanged", () => {
			capturedTemplateProps.length = 0;

			const loadedLinkModels = getMockModels({ id: "1", elementRef: "enumField", width: 1 });
			const links = createLoadedLinks("link-1", "doc/1", { g1: { enumField: "v1" } });
			const props = createWrapperProps({ links, linkModels: loadedLinkModels });

			const { rerender } = render(
				<LocalizerContext.Provider value={createLocalizerContext("English Label")}>
					<SingleSelectionWrapper {...props} />
				</LocalizerContext.Provider>
			);
			rerender(
				<LocalizerContext.Provider value={createLocalizerContext("Deutsches Label")}>
					<SingleSelectionWrapper {...props} />
				</LocalizerContext.Provider>
			);

			expect(capturedTemplateProps[0].selectedItem).toMatchObject({ data: { label: "English Label" } });
			expect(capturedTemplateProps[1].selectedItem).toMatchObject({ data: { label: "Deutsches Label" } });
			expect(capturedTemplateProps[1].selectedItem).not.toBe(capturedTemplateProps[0].selectedItem);
		});
	});

	describe("editAssignmentItem identity", () => {
		test("stays referentially stable across renders when the edited link's id is unchanged", () => {
			capturedTemplateProps.length = 0;

			const { rerender } = renderWrapper(createWrapperProps({ editLink: createLinkWithDocument("edit-1", "doc/3") }));
			rerender(<Wrapped {...createWrapperProps({ editLink: createLinkWithDocument("edit-1", "doc/3") })} />);

			expect(capturedTemplateProps[1].editItem).toBe(capturedTemplateProps[0].editItem);
		});

		test("changes identity when the edited link changes and clears when editLink becomes undefined", () => {
			capturedTemplateProps.length = 0;

			const { rerender } = renderWrapper(createWrapperProps({ editLink: createLinkWithDocument("edit-1", "doc/3") }));
			rerender(<Wrapped {...createWrapperProps({ editLink: createLinkWithDocument("edit-2", "doc/4") })} />);
			rerender(<Wrapped {...createWrapperProps({ editLink: undefined })} />);

			expect(capturedTemplateProps[1].editItem).not.toBe(capturedTemplateProps[0].editItem);
			expect(capturedTemplateProps[1].editItem).toMatchObject({ docRef: "doc/4" });
			expect(capturedTemplateProps[2].editItem).toBeUndefined();
		});

		test("recomputes the label when the edited link's document content settles while its id, targetRole and linkModels.loadingState stay unchanged", () => {
			capturedTemplateProps.length = 0;

			const loadedLinkModels = getMockModels({ id: "1", elementRef: "stringField", width: 1 });
			const unsettledEditLink = createLinkWithDocument("edit-1", "doc/3", {});
			const settledEditLink = createLinkWithDocument("edit-1", "doc/3", { g1: { stringField: "Markt" } });

			const { rerender } = renderWrapper(
				createWrapperProps({ editLink: unsettledEditLink, linkModels: loadedLinkModels })
			);
			rerender(<Wrapped {...createWrapperProps({ editLink: settledEditLink, linkModels: loadedLinkModels })} />);

			expect(capturedTemplateProps[0].editItem).toMatchObject({ label: "" });
			expect(capturedTemplateProps[1].editItem).toMatchObject({ label: "Markt" });
			expect(capturedTemplateProps[1].editItem).not.toBe(capturedTemplateProps[0].editItem);
		});
	});

	describe("areStatePropsEqual", () => {
		test("treats state as equal when nothing relevant changed", () => {
			expect(areStatePropsEqual(createStateProps({}), createStateProps({}))).toBe(true);
		});

		test("does not suppress a legitimate candidates-list update (candidatesFullCount changed)", () => {
			const prev = createStateProps({ candidatesFullCount: 5 });
			const cur = createStateProps({ candidatesFullCount: 6 });

			expect(areStatePropsEqual(prev, cur)).toBe(false);
		});
	});
});

function Wrapped(props: WrapperProps): React.ReactNode {
	return (
		<TestWrapper>
			<SingleSelectionWrapper {...props} />
		</TestWrapper>
	);
}

function renderWrapper(props: WrapperProps) {
	return render(<Wrapped {...props} />);
}

function createWrapperProps(overrides: Partial<WrapperProps>): WrapperProps {
	return {
		activityId: "test-activity",
		instanceId: "test-instance",
		componentConfiguration: { id: "test-component", name: "dropDownSelection", models: [] },
		TemplateComponent: CapturingTemplate,
		candidates: { loadingState: "loaded", data: [] },
		links: { loadingState: "missing" },
		localizableKeyPrefix: "test-prefix-",
		candidatesFullCount: 0,
		targetRole: "target",
		linkModels: { loadingState: "missing" },
		candidateModels: { loadingState: "missing" },
		onSelectLink() {
			/* noop */
		},
		onRemoveLink() {
			/* noop */
		},
		onSearch() {
			/* noop */
		},
		onCancelEditLink() {
			/* noop */
		},
		onEditLink() {
			/* noop */
		},
		onSubmitEditNewLink() {
			/* noop */
		},
		onSubmitEditExistingLink() {
			/* noop */
		},
		...overrides
	};
}

function createLocalizerContext(label: string): LocalizerContextProps {
	const locale: Locale = { language: "en", country: "US" };
	const dataFormats = defaultDataFormats(locale);

	return {
		locale,
		dataFormats,
		conversion: defaultValueConversion(dataFormats),
		localizer: () => label
	};
}

function createStateProps(overrides: Partial<StateProps>): StateProps {
	return {
		candidates: { loadingState: "loaded", data: [] },
		links: { loadingState: "missing" },
		localizableKeyPrefix: "test-prefix-",
		candidatesFullCount: 0,
		linkModels: { loadingState: "missing" },
		candidateModels: { loadingState: "missing" },
		...overrides
	};
}

// Shared default so unchanged documents keep one reference, mirroring the real document graph.
const UNCHANGED_DOCUMENT: object = {};

function createLoadedLinks(id: string, docRef: string, document: object = UNCHANGED_DOCUMENT): Items<AdapterLink[]> {
	return { loadingState: "loaded", data: [{ ...createLinkWithDocument(id, docRef, document), relinked: false }] };
}

function createLinkWithDocument(
	id: string,
	docRef: string,
	document: object = UNCHANGED_DOCUMENT
): RelationshipClientApi.LinkWithDocument {
	return {
		linkRef: createLinkRef(id, docRef),
		document
	};
}

function createLinkRef(id: string, docRef: string): RelationshipServerApi.LinkRef {
	return {
		id,
		linkDescriptor: {
			relationshipModel: "testRelationshipModel",
			entities: [{ role: "target", docRef }]
		}
	};
}
