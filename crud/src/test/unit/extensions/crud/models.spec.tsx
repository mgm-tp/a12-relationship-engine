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

import { Provider } from "react-redux";
import { test, expect, describe } from "vitest";
import { render, screen } from "@testing-library/react";
import { type MockStore, legacy_configureStore as configureStore } from "redux-mock-store";

import type { Model } from "@com.mgmtp.a12.base/base-model-api";
import type { Activity } from "@com.mgmtp.a12.client/client-core";
import type { OverviewEngineFactories } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import { CRUDViews } from "../../../../internal/views.js";
import { TestWrapper } from "../../../utils/testWrapper.js";
import { createTestModels } from "../../../mocks/ModelsUtil.js";
import { createGeneralStore } from "../../../mocks/store/store.js";
import { createActivity, type DocumentListData } from "../../../utils/activity.js";

import { applicationModules } from "./mocks/ApplicationModel.js";

const mountOverviewCRUD = (models: Model[]) => (activity: Activity) => {
	const props: OverviewEngineFactories.ViewComponentProps = {
		activityId: activity.id,
		name: "OverviewCRUD"
	};

	const state = createGeneralStore({
		activities: [activity],
		models,
		modules: applicationModules
	}).getState();

	const store: MockStore = configureStore()(state);

	render(
		<Provider store={store}>
			<TestWrapper>
				<CRUDViews.OverviewEngineView {...props} />
			</TestWrapper>
		</Provider>
	);

	return { props, store };
};

function createActivityWithDataHolder(descriptor: Activity.Descriptor, data: object): Activity {
	return createActivity({
		id: "form",
		descriptor,
		dataHolders: [
			{
				descriptor,
				data,
				dirty: false,
				loadingState: "loaded",
				savingState: "saved",
				slices: {}
			}
		]
	});
}

describe("com.mgmtp.a12.crud.lib.extensions.crud.views", () => {
	describe("OverviewCRUD", () => {
		describe(
			"Given an activity in store and its descriptor has model key set, but no instance, " +
				"the value of the model key is not equal to the actual model names",
			() => {
				const expectedActivity = createActivityWithDataHolder({ model: "any" }, {
					documents: [],
					totalDocumentsCount: 0
				} as DocumentListData);

				describe("Given models in store and their scopes match with the given activity", () => {
					describe("One overview model and the referenced document model in store", () => {
						test("uses correct models to successfully render the overview engine", () => {
							const models: Model[] = createTestModels([
								{ name: "CRUD-overview", modelType: "overview" },
								{ name: "CRUD-document", modelType: "document" }
							]);

							mountOverviewCRUD(models)(expectedActivity);

							expect(screen.getByText("CRUD Overview")).toBeInTheDocument();
						});
					});

					describe("One overview model, the referenced document model and an additional document model in store", () => {
						test("uses correct models to successfully render the overview engine", () => {
							const models: Model[] = createTestModels([
								{ name: "CRUD-overview", modelType: "overview" },
								{ name: "Address-document", modelType: "document" },
								{ name: "CRUD-document", modelType: "document" }
							]);

							mountOverviewCRUD(models)(expectedActivity);
							expect(screen.getByText("CRUD Overview")).toBeInTheDocument();
						});
					});
				});
			}
		);
	});
});
