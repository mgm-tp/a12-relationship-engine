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

import type { ComponentKind } from "../../../../../../src/internal/steps/RuM/extraction/types.js";
import type { ComponentConfiguration } from "../../../../../../src/internal/steps/binding/binding-model.js";
import {
	collectPageSizes,
	collectEditDialogLabels,
	collectOverviewLabelMigrations
} from "../../../../../../src/internal/steps/RuM/extraction/phase-1-binding-extraction/migration-collectors.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeComponent(name: string, overrides?: Record<string, unknown>): ComponentConfiguration {
	return {
		name,
		id: `test-${name.toLowerCase()}`,
		models: [{ name: "CandidateOverview", use: "candidate" }],
		...overrides
	} as ComponentConfiguration;
}

// ---------------------------------------------------------------------------
// collectPageSizes
// ---------------------------------------------------------------------------

describe("collectPageSizes", () => {
	it("should collect candidatePageSize from DropDownSelection component root", () => {
		const comp = makeComponent("DropDownSelection", {
			models: [{ name: "CandidateOverview", use: "candidate" }],
			candidatePageSize: 50
		});
		const kind: ComponentKind = {
			kind: "DropDownSelection",
			component: comp,
			candidatePageSize: 50
		};
		const result = collectPageSizes(kind);

		expect(result).toHaveLength(1);
		expect(result[0].overviewModelId).toBe("CandidateOverview");
		expect(result[0].pageSize).toBe(50);
	});

	it("should collect candidatePageSize from DualPaneSelection component root", () => {
		const comp = makeComponent("DualPaneSelection", {
			models: [
				{ name: "CandidateOverview", use: "candidate" },
				{ name: "SelectedOverview", use: "link" }
			],
			candidatePageSize: 25
		});
		const kind: ComponentKind = {
			kind: "DualPaneSelection",
			component: comp,
			candidatePageSize: 25
		};
		const result = collectPageSizes(kind);

		expect(result).toHaveLength(1);
		expect(result[0].overviewModelId).toBe("CandidateOverview");
		expect(result[0].pageSize).toBe(25);
	});

	it("should collect linkPageSize from TableList component root", () => {
		const comp = makeComponent("TableList", {
			models: [{ name: "SelectedOverview", use: "link" }],
			linkPageSize: 10
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp,
			linkPageSize: 10
		};
		const result = collectPageSizes(kind);

		expect(result).toHaveLength(1);
		expect(result[0].overviewModelId).toBe("SelectedOverview");
		expect(result[0].pageSize).toBe(10);
	});

	it("should return empty array when no page size is set", () => {
		const comp = makeComponent("DropDownSelection");
		const kind: ComponentKind = {
			kind: "DropDownSelection",
			component: comp
		};
		const result = collectPageSizes(kind);

		expect(result).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// collectOverviewLabelMigrations
// ---------------------------------------------------------------------------

describe("collectOverviewLabelMigrations", () => {
	it("should collect availableItemsTable label as overview label migration", () => {
		const comp = makeComponent("DualPaneSelection", {
			models: [
				{ name: "CandidateOverview", use: "candidate" },
				{ name: "SelectedOverview", use: "link" }
			],
			props: {
				availableItemsTable: {
					label: [{ locale: "en", text: "Available Items" }]
				}
			}
		});
		const kind: ComponentKind = {
			kind: "DualPaneSelection",
			component: comp
		};
		const result = collectOverviewLabelMigrations(kind);

		expect(result).toHaveLength(1);
		expect(result[0].overviewModelId).toBe("CandidateOverview");
		expect(result[0].labels[0].text).toBe("Available Items");
		expect(result[0].source).toBe("pane-label");
		// Available pane-label targets base + relationship-specific clones.
		expect(result[0].cloneTargets).toBeDefined();
		expect(result[0].cloneTargets?.has("base")).toBe(true);
		expect(result[0].cloneTargets?.has("RelName")).toBe(true);
		expect(result[0].cloneTargets?.has("tableList")).toBe(false);
		expect(result[0].cloneTargets?.has("edit")).toBe(false);
		expect(result[0].cloneTargets?.has("edit-available")).toBe(false);
	});

	it("should collect selectedItemsTable label as overview label migration", () => {
		const comp = makeComponent("DualPaneSelection", {
			models: [
				{ name: "CandidateOverview", use: "candidate" },
				{ name: "SelectedOverview", use: "link" }
			],
			props: {
				selectedItemsTable: {
					label: [{ locale: "en", text: "Selected Items" }]
				}
			}
		});
		const kind: ComponentKind = {
			kind: "DualPaneSelection",
			component: comp
		};
		const result = collectOverviewLabelMigrations(kind);

		expect(result).toHaveLength(1);
		expect(result[0].overviewModelId).toBe("SelectedOverview");
		expect(result[0].labels[0].text).toBe("Selected Items");
		expect(result[0].source).toBe("pane-label");
		// Phase 11: DualPane selected pane-label targets base + the effective visible edit clone when keepModels remaps there.
		expect(result[0].cloneTargets).toBeDefined();
		expect(result[0].cloneTargets?.has("base")).toBe(true);
		expect(result[0].cloneTargets?.has("edit")).toBe(true);
		expect(result[0].cloneTargets?.has("RelName")).toBe(false);
		expect(result[0].cloneTargets?.has("tableList")).toBe(false);
		expect(result[0].cloneTargets?.has("edit-available")).toBe(false);
	});

	it("should skip outer TableList selectedItemsTable label migration", () => {
		const comp = makeComponent("TableList", {
			models: [{ name: "SelectedOverview", use: "link" }],
			props: {
				selectedItemsTable: {
					label: [{ locale: "en", text: "Selected Items" }]
				}
			}
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp
		};
		const result = collectOverviewLabelMigrations(kind);

		expect(result).toHaveLength(0);
	});

	it("should return empty array when no table labels are set", () => {
		const comp = makeComponent("DropDownSelection", {
			models: [{ name: "CandidateOverview", use: "candidate" }]
		});
		const kind: ComponentKind = {
			kind: "DropDownSelection",
			component: comp
		};
		const result = collectOverviewLabelMigrations(kind);

		expect(result).toHaveLength(0);
	});

	it("should return empty array when props are undefined", () => {
		const comp = makeComponent("DropDownSelection");
		const kind: ComponentKind = {
			kind: "DropDownSelection",
			component: comp
		};
		const result = collectOverviewLabelMigrations(kind);

		expect(result).toHaveLength(0);
	});

	it("should collect nested dualPaneComponent availableItemsTable label with nested-edit-pane-label source and edit-available cloneTarget", () => {
		const mainComp = makeComponent("TableList", {
			models: [
				{ name: "CandidateOverview", use: "candidate" },
				{ name: "SelectedOverview", use: "link" }
			]
		});
		const dualPaneComp = makeComponent("DualPaneSelection", {
			props: {
				availableItemsTable: {
					label: [{ locale: "en", text: "Edit Available Items" }]
				}
			}
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: mainComp,
			dualPaneComponent: dualPaneComp
		};
		const result = collectOverviewLabelMigrations(kind);

		expect(result).toHaveLength(1);
		const migration = result[0];
		expect(migration.overviewModelId).toBe("CandidateOverview");
		expect(migration.labels[0].text).toBe("Edit Available Items");
		expect(migration.source).toBe("nested-edit-pane-label");
		expect(migration.cloneTargets).toBeDefined();
		expect(migration.cloneTargets?.has("edit-available")).toBe(true);
		expect(migration.cloneTargets?.has("edit")).toBe(false);
	});

	it("should collect nested dualPaneComponent selectedItemsTable label with nested-edit-pane-label source and edit cloneTarget", () => {
		const mainComp = makeComponent("TableList", {
			models: [
				{ name: "CandidateOverview", use: "candidate" },
				{ name: "SelectedOverview", use: "link" }
			]
		});
		const dualPaneComp = makeComponent("DualPaneSelection", {
			props: {
				selectedItemsTable: {
					label: [{ locale: "en", text: "Edit Selected Items" }]
				}
			}
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: mainComp,
			dualPaneComponent: dualPaneComp
		};
		const result = collectOverviewLabelMigrations(kind);

		expect(result).toHaveLength(1);
		const migration = result[0];
		expect(migration.overviewModelId).toBe("SelectedOverview");
		expect(migration.labels[0].text).toBe("Edit Selected Items");
		expect(migration.source).toBe("nested-edit-pane-label");
		expect(migration.cloneTargets).toBeDefined();
		expect(migration.cloneTargets?.has("edit")).toBe(true);
		expect(migration.cloneTargets?.has("edit-available")).toBe(false);
	});

	it("should collect both nested dualPaneComponent pane labels when both are present", () => {
		const mainComp = makeComponent("TableList", {
			models: [
				{ name: "CandidateOverview", use: "candidate" },
				{ name: "SelectedOverview", use: "link" }
			]
		});
		const dualPaneComp = makeComponent("DualPaneSelection", {
			props: {
				availableItemsTable: { label: [{ locale: "en", text: "Edit Available" }] },
				selectedItemsTable: { label: [{ locale: "en", text: "Edit Selected" }] }
			}
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: mainComp,
			dualPaneComponent: dualPaneComp
		};
		const result = collectOverviewLabelMigrations(kind);

		expect(result).toHaveLength(2);

		const availMigration = result.find((m) => m.cloneTargets?.has("edit-available"));
		expect(availMigration).toBeDefined();
		expect(availMigration?.overviewModelId).toBe("CandidateOverview");
		expect(availMigration?.source).toBe("nested-edit-pane-label");
		expect(availMigration?.labels[0].text).toBe("Edit Available");

		const selMigration = result.find((m) => m.cloneTargets?.has("edit"));
		expect(selMigration).toBeDefined();
		expect(selMigration?.overviewModelId).toBe("SelectedOverview");
		expect(selMigration?.source).toBe("nested-edit-pane-label");
		expect(selMigration?.labels[0].text).toBe("Edit Selected");
	});

	it("should not collect nested labels when TableList has no dualPaneComponent", () => {
		const comp = makeComponent("TableList", {
			models: [
				{ name: "CandidateOverview", use: "candidate" },
				{ name: "SelectedOverview", use: "link" }
			]
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp
		};
		const result = collectOverviewLabelMigrations(kind);

		expect(result).toHaveLength(0);
	});

	it("should not collect nested labels when TableList dualPaneComponent has no props", () => {
		const mainComp = makeComponent("TableList", {
			models: [
				{ name: "CandidateOverview", use: "candidate" },
				{ name: "SelectedOverview", use: "link" }
			]
		});
		const dualPaneComp = makeComponent("DualPaneSelection");
		const kind: ComponentKind = {
			kind: "TableList",
			component: mainComp,
			dualPaneComponent: dualPaneComp
		};
		const result = collectOverviewLabelMigrations(kind);

		expect(result).toHaveLength(0);
	});

	it("should not emit edit-available migration when outer TableList has no candidate model (link-only); nested-edit selected still emitted when link exists", () => {
		// Gap 3 (reviewer note): outer TableList with link-only outer component.models + nested DualPane labels.
		// collectOverviewLabelMigrations uses outer component.models for the overviewModelId lookup.
		// Without a candidate model, no edit-available migration can be emitted (findModelNameForUse
		// returns undefined for 'candidate'). The nested-edit selected migration CAN still be emitted
		// because the outer component.models has a 'link' entry.
		const mainComp = makeComponent("TableList", {
			models: [
				// Only link model \u2014 no candidate
				{ name: "LinkOnlyOverview", use: "link" }
			]
		});
		const dualPaneComp = makeComponent("DualPaneSelection", {
			props: {
				availableItemsTable: { label: [{ locale: "en", text: "Edit Available Items" }] },
				selectedItemsTable: { label: [{ locale: "en", text: "Edit Selected Items" }] }
			}
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: mainComp,
			dualPaneComponent: dualPaneComp
		};
		const result = collectOverviewLabelMigrations(kind);

		// No edit-available migration: outer TableList has no candidate model in component.models
		const editAvailableMigrations = result.filter((m) => m.cloneTargets?.has("edit-available"));

		expect(editAvailableMigrations).toHaveLength(0);

		// Nested-edit selected migration IS emitted because link model exists in outer component.models
		const nestedSelectedMigrations = result.filter(
			(m) => m.source === "nested-edit-pane-label" && m.cloneTargets?.has("edit")
		);

		expect(nestedSelectedMigrations).toHaveLength(1);
		expect(nestedSelectedMigrations[0].overviewModelId).toBe("LinkOnlyOverview");
		expect(nestedSelectedMigrations[0].labels[0].text).toBe("Edit Selected Items");
	});

	it("should keep only nested-edit-pane-label migration when main and nested selected labels both exist", () => {
		const mainComp = makeComponent("TableList", {
			models: [
				{ name: "CandidateOverview", use: "candidate" },
				{ name: "SelectedOverview", use: "link" }
			],
			props: {
				selectedItemsTable: { label: [{ locale: "en", text: "Main Selected" }] }
			}
		});
		const dualPaneComp = makeComponent("DualPaneSelection", {
			props: {
				selectedItemsTable: { label: [{ locale: "en", text: "Edit Selected" }] }
			}
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: mainComp,
			dualPaneComponent: dualPaneComp
		};
		const result = collectOverviewLabelMigrations(kind);

		expect(result).toHaveLength(1);

		const nestedMigration = result.find((m) => m.source === "nested-edit-pane-label");
		expect(nestedMigration).toBeDefined();
		expect(nestedMigration?.labels[0].text).toBe("Edit Selected");
		expect(nestedMigration?.cloneTargets?.has("edit")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// collectEditDialogLabels
// ---------------------------------------------------------------------------

describe("collectEditDialogLabels", () => {
	it("should collect editDialogTitle from TableList props", () => {
		const comp = makeComponent("TableList", {
			props: {
				editDialogTitle: {
					label: [{ locale: "en", text: "Edit Relationship" }]
				}
			}
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp
		};
		const result = collectEditDialogLabels(kind);

		expect(result.editDialogTitle).toBeDefined();
		expect(result.editDialogTitle?.[0].text).toBe("Edit Relationship");
	});

	it("should collect editDialogCancelButtonLabel from props", () => {
		const comp = makeComponent("TableList", {
			props: {
				editDialogCancelButtonLabel: {
					label: [{ locale: "en", text: "Cancel" }]
				}
			}
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp
		};
		const result = collectEditDialogLabels(kind);

		expect(result.editDialogCancelButtonLabel).toBeDefined();
		expect(result.editDialogCancelButtonLabel?.[0].text).toBe("Cancel");
	});

	it("should collect editDialogCloseButtonLabel from props", () => {
		const comp = makeComponent("TableList", {
			props: {
				editDialogCloseButtonLabel: {
					label: [{ locale: "en", text: "Close" }]
				}
			}
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp
		};
		const result = collectEditDialogLabels(kind);

		expect(result.editDialogCloseButtonLabel).toBeDefined();
		expect(result.editDialogCloseButtonLabel?.[0].text).toBe("Close");
	});

	it("should return all dialog labels", () => {
		const comp = makeComponent("TableList", {
			props: {
				editDialogTitle: { label: [{ locale: "en", text: "Edit" }] },
				editDialogCancelButtonLabel: { label: [{ locale: "en", text: "Cancel" }] },
				editDialogCloseButtonLabel: { label: [{ locale: "en", text: "Close" }] }
			}
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp
		};
		const result = collectEditDialogLabels(kind);

		expect(result.editDialogTitle?.[0].text).toBe("Edit");
		expect(result.editDialogCancelButtonLabel?.[0].text).toBe("Cancel");
		expect(result.editDialogCloseButtonLabel?.[0].text).toBe("Close");
	});

	it("should return empty object when no dialog labels are set", () => {
		const comp = makeComponent("TableList");
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp
		};
		const result = collectEditDialogLabels(kind);

		expect(result.editDialogTitle).toBeUndefined();
		expect(result.editDialogCancelButtonLabel).toBeUndefined();
		expect(result.editDialogCloseButtonLabel).toBeUndefined();
	});
});
