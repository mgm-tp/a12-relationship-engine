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

import { it, expect, describe } from "vitest";

import type { FinalRuM } from "../../../../../../src/internal/steps/RuM/extraction/types.js";
import { RUM_VERSION } from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import type { RelationshipUiModel } from "../../../../../../src/internal/steps/RuM/relationship-ui-model.js";
import { remapOverviewRefsInBindings } from "../../../../../../src/internal/steps/RuM/extraction/phase-5-reference-remapping/overview-ref-remapper.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RuMOverrides = {
	header?: Partial<RelationshipUiModel["header"]>;
	content?: {
		readonly relationshipName?: string;
		readonly targetRole?: string;
		readonly component?: Partial<RelationshipUiModel.ComponentConfiguration>;
	};
};

function createRuM(overrides?: RuMOverrides): RelationshipUiModel {
	return {
		header: {
			id: "TestForm-binding-test-binding_RuM",
			modelType: "relationship-ui",
			modelVersion: RUM_VERSION,
			modelReferences: [
				{ modelType: "overview", reference: "OriginalOverview", purpose: "overview" },
				{ modelType: "document", reference: "PersonDM", purpose: "document" }
			],
			annotations: [],
			...(overrides?.header ?? {})
		},
		content: {
			relationshipName: "TestRelationship",
			targetRole: "TestRole",
			component: {
				componentType: "DualPaneSelection",
				availableItemsOverviewModel: "OriginalOverview",
				selectedItemsOverviewModel: "LinkOverview",
				...((overrides?.content?.component ?? {}) as Record<string, unknown>)
			},
			...((overrides?.content ?? {}) as Record<string, unknown>)
		}
	};
}

function createFinalRuM(overrides?: Partial<FinalRuM>): FinalRuM {
	return {
		model: createRuM(),
		elementId: "test-element",
		formModelId: "TestForm",
		...overrides
	};
}

// ---------------------------------------------------------------------------
// remapOverviewRefsInBindings
// ---------------------------------------------------------------------------

describe("remapOverviewRefsInBindings", () => {
	it("should remap single-context overview references in component", () => {
		const fr = createFinalRuM();
		const cloneMap = new Map<string, string>([["OriginalOverview", "OriginalOverview-clone"]]);
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		const result = remapOverviewRefsInBindings([fr], cloneMap, multiContextRemap, new Set());

		expect(result).toHaveLength(1);
		expect(result[0].model.content.component.availableItemsOverviewModel).toBe("OriginalOverview-clone");
		expect(result[0].model.content.component.selectedItemsOverviewModel).toBe("LinkOverview");
	});

	it("should remap modelReferences entries with modelType overview", () => {
		const fr = createFinalRuM();
		const cloneMap = new Map<string, string>([["OriginalOverview", "OriginalOverview-clone"]]);
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		const result = remapOverviewRefsInBindings([fr], cloneMap, multiContextRemap, new Set());

		const refs = result[0].model.header.modelReferences ?? [];
		const overviewRef = refs.find((r) => r.modelType === "overview");
		expect(overviewRef?.reference).toBe("OriginalOverview-clone");

		const docRef = refs.find((r) => r.modelType === "document");
		expect(docRef?.reference).toBe("PersonDM");
	});

	it("should leave non-overview modelReferences unchanged", () => {
		const fr = createFinalRuM();
		const cloneMap = new Map<string, string>([["OriginalOverview", "OriginalOverview-clone"]]);
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		const result = remapOverviewRefsInBindings([fr], cloneMap, multiContextRemap, new Set());

		const refs = result[0].model.header.modelReferences ?? [];
		const docRef = refs.find((r) => r.modelType === "document");
		expect(docRef?.reference).toBe("PersonDM");
	});

	it("should remap editConfiguration overview refs", () => {
		const rum = createRuM({
			content: {
				relationshipName: "TestRelationship",
				targetRole: "TestRole",
				component: {
					componentType: "TableList",
					editConfiguration: {
						availableItemsOverviewModel: "CandidateOverview",
						selectedItemsOverviewModel: "SelectedOverview"
					}
				}
			}
		});
		const fr = createFinalRuM({ model: rum });
		const cloneMap = new Map<string, string>([
			["CandidateOverview", "CandidateOverview-clone"],
			["SelectedOverview", "SelectedOverview-clone"]
		]);
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		const result = remapOverviewRefsInBindings([fr], cloneMap, multiContextRemap, new Set());

		const ec = result[0].model.content.component.editConfiguration;
		expect(ec?.availableItemsOverviewModel).toBe("CandidateOverview-clone");
		expect(ec?.selectedItemsOverviewModel).toBe("SelectedOverview-clone");
	});

	it("should remap TableList direct selected ref to '-tableList' while keeping edit selected ref on '-edit'", () => {
		const rum = createRuM({
			header: {
				modelReferences: [
					{ modelType: "overview", reference: "SelectedOverview", purpose: "overview" },
					{ modelType: "document", reference: "PersonDM", purpose: "document" }
				]
			},
			content: {
				relationshipName: "TestRelationship",
				targetRole: "TestRole",
				component: {
					componentType: "TableList",
					selectedItemsOverviewModel: "SelectedOverview",
					editConfiguration: {
						availableItemsOverviewModel: "CandidateOverview",
						selectedItemsOverviewModel: "SelectedOverview"
					}
				}
			}
		});
		const fr = createFinalRuM({ model: rum });
		const cloneMap = new Map<string, string>([["SelectedOverview", "SelectedOverview-edit"]]);

		const result = remapOverviewRefsInBindings(
			[fr],
			cloneMap,
			new Map(),
			new Set(["SelectedOverview", "SelectedOverview-edit", "SelectedOverview-tableList"])
		);

		const component = result[0].model.content.component;
		expect(component.selectedItemsOverviewModel).toBe("SelectedOverview-tableList");
		expect(component.editConfiguration?.selectedItemsOverviewModel).toBe("SelectedOverview-edit");

		const overviewRefs = (result[0].model.header.modelReferences ?? []).filter((ref) => ref.modelType === "overview");
		expect(overviewRefs.some((ref) => ref.reference === "SelectedOverview-tableList")).toBe(true);
		expect(overviewRefs.some((ref) => ref.reference === "SelectedOverview-edit")).toBe(true);
	});

	it("should remap via multiContextRemap when not in cloneMap", () => {
		const rum = createRuM({
			content: {
				relationshipName: "MultiRel",
				targetRole: "MultiRole",
				component: {
					componentType: "DualPaneSelection",
					availableItemsOverviewModel: "SharedOverview",
					selectedItemsOverviewModel: "LinkOverview"
				}
			}
		});
		const fr = createFinalRuM({ model: rum });
		const cloneMap = new Map<string, string>();
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>([
			["SharedOverview", new Map<string, string>([["MultiRel", "SharedOverview-multi-clone"]])]
		]);

		const result = remapOverviewRefsInBindings(
			[fr],
			cloneMap,
			multiContextRemap,
			new Set(["SharedOverview-multi-clone"])
		);

		expect(result[0].model.content.component.availableItemsOverviewModel).toBe("SharedOverview-multi-clone");
	});

	it("should prefer cloneMap over multiContextRemap", () => {
		const rum = createRuM({
			content: {
				relationshipName: "MultiRel",
				targetRole: "MultiRole",
				component: {
					componentType: "DualPaneSelection",
					availableItemsOverviewModel: "SharedOverview",
					selectedItemsOverviewModel: "LinkOverview"
				}
			}
		});
		const fr = createFinalRuM({ model: rum });
		const cloneMap = new Map<string, string>([["SharedOverview", "single-clone"]]);
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>([
			["SharedOverview", new Map<string, string>([["MultiRel", "multi-clone"]])]
		]);

		const result = remapOverviewRefsInBindings([fr], cloneMap, multiContextRemap, new Set(["single-clone"]));

		// cloneMap takes priority
		expect(result[0].model.content.component.availableItemsOverviewModel).toBe("single-clone");
	});

	it("should return unchanged ref when no mapping exists", () => {
		const fr = createFinalRuM();
		const cloneMap = new Map<string, string>();
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		const result = remapOverviewRefsInBindings([fr], cloneMap, multiContextRemap, new Set());

		expect(result[0].model.content.component.availableItemsOverviewModel).toBe("OriginalOverview");
	});

	it("should remap keepModels plain DualPaneSelection selected and header refs to existing '-edit' clone", () => {
		const rum = createRuM({
			header: {
				modelReferences: [
					{ modelType: "overview", reference: "Address-overview--Location", purpose: "overview" },
					{ modelType: "overview", reference: "LocationLinks-overview", purpose: "overview" },
					{ modelType: "document", reference: "BusinessPartnerDM", purpose: "document" }
				]
			},
			content: {
				relationshipName: "Location",
				targetRole: "Location",
				component: {
					componentType: "DualPaneSelection",
					availableItemsOverviewModel: "Address-overview--Location",
					selectedItemsOverviewModel: "LocationLinks-overview"
				}
			}
		});
		const fr = createFinalRuM({ model: rum });
		const cloneMap = new Map<string, string>([["LocationLinks-overview", "LocationLinks-overview-edit"]]);
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		const result = remapOverviewRefsInBindings(
			[fr],
			cloneMap,
			multiContextRemap,
			new Set(["LocationLinks-overview", "LocationLinks-overview-edit", "Address-overview--Location"])
		);

		expect(result[0].model.content.component.selectedItemsOverviewModel).toBe("LocationLinks-overview-edit");

		const overviewRefs = (result[0].model.header.modelReferences ?? []).filter((ref) => ref.modelType === "overview");
		expect(overviewRefs.some((ref) => ref.reference === "LocationLinks-overview-edit")).toBe(true);
		expect(overviewRefs.some((ref) => ref.reference === "LocationLinks-overview")).toBe(false);
	});

	it("should remap plain DualPaneSelection selected ref to existing canonical '-edit' clone when cloneMap has no selected hit", () => {
		const rum = createRuM({
			header: {
				modelReferences: [
					{ modelType: "overview", reference: "Address-overview--Location", purpose: "overview" },
					{ modelType: "overview", reference: "LocationLinks-overview", purpose: "overview" },
					{ modelType: "document", reference: "BusinessPartnerDM", purpose: "document" }
				]
			},
			content: {
				relationshipName: "Location",
				targetRole: "Location",
				component: {
					componentType: "DualPaneSelection",
					availableItemsOverviewModel: "Address-overview--Location",
					selectedItemsOverviewModel: "LocationLinks-overview"
				}
			}
		});
		const fr = createFinalRuM({ model: rum });
		const cloneMap = new Map<string, string>([["AnotherOverview", "AnotherOverview-edit"]]);
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		const result = remapOverviewRefsInBindings(
			[fr],
			cloneMap,
			multiContextRemap,
			new Set(["LocationLinks-overview", "LocationLinks-overview-edit", "Address-overview--Location"])
		);

		expect(result[0].model.content.component.selectedItemsOverviewModel).toBe("LocationLinks-overview-edit");

		const overviewRefs = (result[0].model.header.modelReferences ?? []).filter((ref) => ref.modelType === "overview");
		expect(overviewRefs.some((ref) => ref.reference === "LocationLinks-overview-edit")).toBe(true);
		expect(overviewRefs.some((ref) => ref.reference === "LocationLinks-overview")).toBe(false);
	});

	it("should keep plain DualPaneSelection selected ref unchanged when cloneMap has no selected hit", () => {
		const rum = createRuM({
			header: {
				modelReferences: [
					{ modelType: "overview", reference: "Address-overview--Location", purpose: "overview" },
					{ modelType: "overview", reference: "LocationLinks-overview", purpose: "overview" },
					{ modelType: "document", reference: "BusinessPartnerDM", purpose: "document" }
				]
			},
			content: {
				relationshipName: "Location",
				targetRole: "Location",
				component: {
					componentType: "DualPaneSelection",
					availableItemsOverviewModel: "Address-overview--Location",
					selectedItemsOverviewModel: "LocationLinks-overview"
				}
			}
		});
		const fr = createFinalRuM({ model: rum });
		const cloneMap = new Map<string, string>([["AnotherOverview", "AnotherOverview-edit"]]);
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		const result = remapOverviewRefsInBindings(
			[fr],
			cloneMap,
			multiContextRemap,
			new Set(["LocationLinks-overview", "Address-overview--Location"])
		);

		expect(result[0].model.content.component.selectedItemsOverviewModel).toBe("LocationLinks-overview");

		const overviewRefs = (result[0].model.header.modelReferences ?? []).filter((ref) => ref.modelType === "overview");
		expect(overviewRefs.some((ref) => ref.reference === "LocationLinks-overview")).toBe(true);
	});

	it("should keep TableList direct selected ref unchanged when '-tableList' clone is missing", () => {
		const rum = createRuM({
			content: {
				relationshipName: "Rel",
				targetRole: "TestRole",
				component: {
					componentType: "TableList",
					selectedItemsOverviewModel: "SelectedOverview",
					editConfiguration: {
						availableItemsOverviewModel: "CandidateOverview",
						selectedItemsOverviewModel: "SelectedOverview"
					}
				}
			}
		});
		const fr = createFinalRuM({ model: rum });

		const result = remapOverviewRefsInBindings(
			[fr],
			new Map([["SelectedOverview", "SelectedOverview-edit"]]),
			new Map(),
			new Set(["SelectedOverview", "SelectedOverview-edit"])
		);

		expect(result[0].model.content.component.selectedItemsOverviewModel).toBe("SelectedOverview");
	});

	it("should implicitly remap TableList editConfiguration available overview to '--<relationship>' when clone exists", () => {
		const rum = createRuM({
			header: {
				modelReferences: [
					{ modelType: "overview", reference: "CandidateOverview", purpose: "overview" },
					{ modelType: "document", reference: "PersonDM", purpose: "document" }
				]
			},
			content: {
				relationshipName: "Rel",
				targetRole: "TestRole",
				component: {
					componentType: "TableList",
					editConfiguration: {
						availableItemsOverviewModel: "CandidateOverview",
						selectedItemsOverviewModel: "SelectedOverview"
					}
				}
			}
		});
		const fr = createFinalRuM({ model: rum });

		const result = remapOverviewRefsInBindings([fr], new Map(), new Map(), new Set(["CandidateOverview--Rel"]));

		expect(result[0].model.content.component.editConfiguration?.availableItemsOverviewModel).toBe(
			"CandidateOverview--Rel"
		);

		const overviewRefs = (result[0].model.header.modelReferences ?? []).filter((ref) => ref.modelType === "overview");
		expect(overviewRefs.map((r) => r.reference)).toEqual(["CandidateOverview--Rel", "SelectedOverview"]);
	});

	it("should keep TableList editConfiguration available overview unchanged when '--<relationship>' clone is missing", () => {
		const rum = createRuM({
			header: {
				modelReferences: [
					{ modelType: "overview", reference: "CandidateOverview", purpose: "overview" },
					{ modelType: "document", reference: "PersonDM", purpose: "document" }
				]
			},
			content: {
				relationshipName: "Rel",
				targetRole: "TestRole",
				component: {
					componentType: "TableList",
					editConfiguration: {
						availableItemsOverviewModel: "CandidateOverview",
						selectedItemsOverviewModel: "SelectedOverview"
					}
				}
			}
		});
		const fr = createFinalRuM({ model: rum });

		const result = remapOverviewRefsInBindings([fr], new Map(), new Map(), new Set());

		expect(result[0].model.content.component.editConfiguration?.availableItemsOverviewModel).toBe("CandidateOverview");

		const overviewRefs = (result[0].model.header.modelReferences ?? []).filter((ref) => ref.modelType === "overview");
		expect(overviewRefs.map((r) => r.reference)).toEqual(["CandidateOverview", "SelectedOverview"]);
	});

	it("should implicitly remap plain DualPaneSelection availableItemsOverviewModel to '--<relationship>' when clone exists", () => {
		const rum = createRuM({
			content: {
				relationshipName: "Rel",
				targetRole: "TestRole",
				component: {
					componentType: "DualPaneSelection",
					availableItemsOverviewModel: "Address-overview",
					selectedItemsOverviewModel: "LinkOverview"
				}
			}
		});
		const fr = createFinalRuM({ model: rum });
		const cloneMap = new Map<string, string>();
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		const result = remapOverviewRefsInBindings([fr], cloneMap, multiContextRemap, new Set(["Address-overview--Rel"]));

		expect(result[0].model.content.component.availableItemsOverviewModel).toBe("Address-overview--Rel");
	});

	it("should implicitly remap DualPaneSelection available header refs using the original component match", () => {
		const rum = createRuM({
			header: {
				modelReferences: [
					{ modelType: "overview", reference: "Address-overview", purpose: "overview" },
					{ modelType: "document", reference: "PersonDM", purpose: "document" }
				]
			},
			content: {
				relationshipName: "Rel",
				targetRole: "TestRole",
				component: {
					componentType: "DualPaneSelection",
					availableItemsOverviewModel: "Address-overview",
					selectedItemsOverviewModel: "LinkOverview"
				}
			}
		});

		const result = remapOverviewRefsInBindings(
			[createFinalRuM({ model: rum })],
			new Map(),
			new Map(),
			new Set(["Address-overview--Rel"])
		);

		expect(result[0].model.content.component.availableItemsOverviewModel).toBe("Address-overview--Rel");
		expect(result[0].model.header.modelReferences?.find((ref) => ref.modelType === "overview")?.reference).toBe(
			"Address-overview--Rel"
		);
	});

	it("should append remapped TableList edit refs when header overview refs are missing", () => {
		const rum = createRuM({
			header: {
				modelReferences: [{ modelType: "document", reference: "PersonDM", purpose: "document" }]
			},
			content: {
				relationshipName: "Rel",
				targetRole: "TestRole",
				component: {
					componentType: "TableList",
					editConfiguration: {
						availableItemsOverviewModel: "CandidateOverview",
						selectedItemsOverviewModel: "SelectedOverview"
					}
				}
			}
		});

		const result = remapOverviewRefsInBindings(
			[createFinalRuM({ model: rum })],
			new Map([["SelectedOverview", "SelectedOverview-edit"]]),
			new Map(),
			new Set(["CandidateOverview--Rel", "SelectedOverview-edit"])
		);

		expect(result[0].model.header.modelReferences?.filter((ref) => ref.modelType === "overview")).toEqual([
			{ modelType: "overview", reference: "CandidateOverview--Rel", purpose: "overview" },
			{ modelType: "overview", reference: "SelectedOverview-edit", purpose: "overview" }
		]);
	});

	it("should handle empty maps and no refs", () => {
		const fr = createFinalRuM({
			model: createRuM({
				header: { modelReferences: [] },
				content: {
					relationshipName: "Test",
					targetRole: "Role",
					component: { componentType: "DualPaneSelection" }
				}
			})
		});
		const cloneMap = new Map<string, string>();
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		const result = remapOverviewRefsInBindings([fr], cloneMap, multiContextRemap, new Set());

		expect(result).toHaveLength(1);
		expect(result[0].model.content.component.availableItemsOverviewModel).toBeUndefined();
	});

	it("should handle multiple FinalRuM entries", () => {
		const fr1 = createFinalRuM({ elementId: "elem1" });
		const fr2 = createFinalRuM({
			elementId: "elem2",
			model: createRuM({
				content: {
					relationshipName: "OtherRel",
					targetRole: "OtherRole",
					component: {
						componentType: "DualPaneSelection",
						availableItemsOverviewModel: "OtherOverview",
						selectedItemsOverviewModel: "OtherLink"
					}
				}
			})
		});
		const cloneMap = new Map<string, string>([
			["OriginalOverview", "OriginalOverview-clone"],
			["OtherOverview", "OtherOverview-clone"]
		]);
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		const result = remapOverviewRefsInBindings([fr1, fr2], cloneMap, multiContextRemap, new Set());

		expect(result).toHaveLength(2);
		expect(result[0].model.content.component.availableItemsOverviewModel).toBe("OriginalOverview-clone");
		expect(result[1].model.content.component.availableItemsOverviewModel).toBe("OtherOverview-clone");
	});

	it("should handle modelReferences being undefined", () => {
		const rum = createRuM({
			header: { modelReferences: undefined },
			content: {
				relationshipName: "Test",
				targetRole: "Role",
				component: { componentType: "DualPaneSelection" }
			}
		});
		const fr = createFinalRuM({ model: rum });
		const cloneMap = new Map<string, string>();
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		const result = remapOverviewRefsInBindings([fr], cloneMap, multiContextRemap, new Set());

		expect(result).toHaveLength(1);
	});
});
