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
import { render } from "@testing-library/react";
import { vi, test, expect, describe, beforeEach } from "vitest";

import { Enablements } from "@com.mgmtp.a12.formengine/formengine-core";

import { DetachedRepeat } from "../../../view/index.js";
import * as shared from "../../../view/internal/shared.js";
import { CustomScreenElement } from "../../../view/index.js";

vi.mock("@com.mgmtp.a12.formengine/formengine-core", async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();

	return {
		...actual,
		Enablements: {
			...(actual["Enablements"] as Record<string, unknown>),
			isHidden: vi.fn()
		},
		DefaultFormModelMap: {
			CustomScreenElement: { component: () => <div data-testid="fe-default-custom-screen-element" /> },
			DetachedRepeat: { component: () => <div data-testid="fe-default-detached-repeat" /> }
		}
	};
});

vi.mock("@com.mgmtp.a12.client/client-core", () => ({
	ViewViews: {
		ActivityContext: React.createContext(null)
	}
}));

vi.mock("../../../view/internal/shared.js", () => ({
	useRelationshipUiModel: vi.fn()
}));

vi.mock("../../../view/internal/context/RelationshipEngineContext.js", () => ({
	useRelationshipEngineContext: vi.fn()
}));

const mockIsHidden = vi.mocked(Enablements.isHidden);
const mockUseBinding = vi.mocked(shared.useRelationshipUiModel);

const mockModelElement = {
	id: "test-element-id",
	annotations: [{ name: "a12-relationship-ui-model-reference", value: "test-ui-model" }]
} as never;
const mockState = {} as never;
const mockProps = {
	modelElement: mockModelElement as never,
	config: {
		renderOptions: { state: mockState },
		parentPath: []
	} as never
};

describe("CustomScreenElement hide condition", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseBinding.mockReturnValue(undefined);
	});

	test("returns null when hide condition matches", () => {
		mockIsHidden.mockReturnValue(true);
		mockUseBinding.mockReturnValue({} as never);

		const { container } = render(<CustomScreenElement {...mockProps} />);

		expect(container.firstChild).toBeNull();
		expect(mockIsHidden).toHaveBeenCalledWith({
			formModelElement: mockModelElement,
			dataContext: [],
			state: mockState
		});
	});

	test("renders FE default when not hidden and no binding", () => {
		mockIsHidden.mockReturnValue(false);

		const { getByTestId } = render(<CustomScreenElement {...mockProps} />);

		expect(getByTestId("fe-default-custom-screen-element")).toBeDefined();
	});

	test("isHidden called with empty dataContext (root level)", () => {
		mockIsHidden.mockReturnValue(false);
		mockUseBinding.mockReturnValue({} as never);

		render(<CustomScreenElement {...mockProps} />);

		expect(mockIsHidden).toHaveBeenCalledWith(expect.objectContaining({ dataContext: [] }));
	});
});

describe("DetachedRepeat hide condition", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseBinding.mockReturnValue(undefined);
	});

	test("returns null when hide condition matches", () => {
		mockIsHidden.mockReturnValue(true);
		mockUseBinding.mockReturnValue({} as never);

		const { container } = render(<DetachedRepeat {...mockProps} />);

		expect(container.firstChild).toBeNull();
		expect(mockIsHidden).toHaveBeenCalledWith({
			formModelElement: mockModelElement,
			dataContext: [],
			state: mockState
		});
	});

	test("renders FE default when not hidden and no binding", () => {
		mockIsHidden.mockReturnValue(false);

		const { getByTestId } = render(<DetachedRepeat {...mockProps} />);

		expect(getByTestId("fe-default-detached-repeat")).toBeDefined();
	});
});
