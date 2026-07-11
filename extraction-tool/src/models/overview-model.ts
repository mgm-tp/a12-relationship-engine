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

import type { Header, Annotation } from "@com.mgmtp.a12.base/base-model-api";
import type { LocalizedModelText } from "@com.mgmtp.a12.utils/utils-localization";
import type { Query as DSQuery } from "@com.mgmtp.a12.dataservices/dataservices-access";

export interface OverviewModel {
	readonly header: Header;
	readonly content: OverviewModel.Content;
}

export namespace OverviewModel {
	export interface Content {
		readonly configuration: Configuration;

		readonly subHeaderBox?: SubHeaderBox;
		readonly footerBox?: FooterBox;

		readonly columns: ReadonlyArray<Column>;

		readonly rowActionGroup: RowActionGroup;
		readonly rowActivation?: RowActivation;

		readonly contextMenu?: ContextMenu;

		readonly styles?: Styles;
	}

	export interface Configuration {
		readonly pagingSize?: number;
		readonly initialSorting?: ColumnRef[];
		readonly screenReaderColumn?: ColumnRef;
		readonly showFullTextSearch?: boolean;
		readonly labelHidden?: true;
		readonly showRowCount?: true;

		readonly enableColumnsResize?: true;
		readonly enableFilter: boolean;
		readonly filterConfiguration?: FilterConfiguration;
		readonly newFilterConfiguration?: NewFilterConfiguration;

		readonly multiSelection?: MultiSelection;

		readonly rowHeight?: number;
		readonly actionColumnWidth?: Width;
		readonly enableInfiniteScroll?: true;

		readonly subtitle?: LocalizedModelText;
		readonly rowTitle?: LocalizedModelText;

		readonly skipInitialLoad?: true;
	}

	export interface ContextMenu {
		readonly groups: ActionGroup[];
	}

	export interface ActionGroup {
		readonly name: string;
		readonly title?: LocalizedModelText;
		readonly actions: ReadonlyArray<ContextMenuItem>;
	}

	export interface ColumnRef {
		readonly idref: string;
	}

	export type Styles = ReadonlyArray<string>;

	export type Width = number;

	export type PinDirection = "RIGHT" | "LEFT";

	export type Column = ReferenceColumn | ExpressionColumn | LinkColumn.Reference | LinkColumn.Expression;

	export interface ReferenceColumn extends BaseColumn {
		readonly elementRef: string;

		/**
		 * @default false
		 */
		readonly sortable?: boolean;

		/**
		 * @default ASC
		 */
		readonly preferredSorting?: "ASC" | "DESC";

		/**
		 * @default {@link OverviewModel.AttachmentDisplayMode.PREVIEW}
		 */
		readonly attachmentDisplayMode?: AttachmentDisplayMode;
		readonly multiSelectDisplayMode?: MultiSelectDisplayMode;

		// suffix of number field
		readonly suffix?: LocalizedModelText;

		readonly suffixRef?: string;

		readonly summary?: Summary[];
	}

	export interface Summary {
		readonly operation: Summary.Operation | never;
	}

	export namespace Summary {
		export enum Operation {
			SUM = "sum"
		}
	}

	export namespace ReferenceColumn {
		export function isAssignableFrom(column: object): column is ReferenceColumn {
			return "elementRef" in column && !BaseLinkedColumn.isAssignableFrom(column);
		}
	}

	export interface ExpressionColumn extends BaseColumn {
		readonly name: string;
		readonly expression: string;
	}

	export namespace ExpressionColumn {
		export function isAssignableFrom(column: object): column is ExpressionColumn {
			return "expression" in column && !BaseLinkedColumn.isAssignableFrom(column);
		}
	}

	/**
	 * @experimental
	 */
	export interface LinkReference {
		readonly relationship: string;
		readonly targetRole: string;
		readonly type: "CHILD" | "LINK";
	}

	/**
	 * @experimental
	 */
	export interface BaseLinkedColumn {
		readonly linkReferences: LinkReference[];
	}

	/**
	 * @experimental
	 */
	export namespace BaseLinkedColumn {
		export function isAssignableFrom(column: object): column is BaseLinkedColumn {
			return "linkReferences" in column && Array.isArray(column.linkReferences);
		}
	}

	/**
	 * @experimental
	 */
	export namespace LinkColumn {
		export interface Reference extends Omit<ReferenceColumn, "summary">, BaseLinkedColumn {}

		export namespace Reference {
			export function isAssignableFrom(column: object): column is Reference {
				return BaseLinkedColumn.isAssignableFrom(column) && "elementRef" in column;
			}
		}

		export interface Expression extends ExpressionColumn, BaseLinkedColumn {}

		export namespace Expression {
			export function isAssignableFrom(column: object): column is Expression {
				return BaseLinkedColumn.isAssignableFrom(column) && "expression" in column;
			}
		}
	}

	export interface BaseColumn {
		readonly label?: LocalizedModelText;
		readonly icon?: Icon;
		readonly labelHidden?: true;
		readonly id: string;
		readonly width: Width;
		readonly fixedWidth?: true;
		readonly pinDirection?: PinDirection;
		readonly alignment?: ColumnAlignment;
		readonly styles?: ColumnStyles;
	}

	export interface SubHeaderBox {
		readonly leftSlot?: ReadonlyArray<Element>;
		readonly rightSlot?: ReadonlyArray<Element>;
	}

	export interface FooterBox {
		readonly leftSlot?: ReadonlyArray<ButtonElement>;
		readonly rightSlot?: ReadonlyArray<ButtonElement>;
	}

	export type Element = ButtonElement | MultiSelectionElement | SearchElement | FilterElement;

	export interface BaseElement {
		readonly type: ElementType;
	}

	export interface ButtonElement extends BaseElement, Button {
		readonly type: ElementType.BUTTON;
	}

	export namespace ButtonElement {
		export function isAssignableFrom(element: object): element is ButtonElement {
			return (element as ButtonElement).type === ElementType.BUTTON;
		}
	}

	export interface MultiSelectionElement extends BaseElement {
		readonly type: ElementType.MULTI_SELECTION;
	}

	export namespace MultiSelectionElement {
		export function isAssignableFrom(element: object): element is MultiSelectionElement {
			return (element as MultiSelectionElement).type === ElementType.MULTI_SELECTION;
		}
	}

	export interface SearchElement extends BaseElement {
		readonly type: ElementType.SEARCH;
	}

	export namespace SearchElement {
		export function isAssignableFrom(element: object): element is SearchElement {
			return (element as SearchElement).type === ElementType.SEARCH;
		}
	}

	export interface FilterElement extends BaseElement {
		readonly type: ElementType.FILTER;
	}

	export namespace FilterElement {
		export function isAssignableFrom(element: object): element is FilterElement {
			return (element as FilterElement).type === ElementType.FILTER;
		}
	}

	export enum ElementType {
		BUTTON = "button",
		MULTI_SELECTION = "multi_selection",
		SEARCH = "search",
		FILTER = "filter"
	}

	export interface SectionItem {
		readonly label: LocalizedModelText;
		readonly id: string;
		readonly fields: ReadonlyArray<FieldConfiguration>;
	}

	export interface FilterConfiguration {
		readonly showFilterButton: boolean;
		readonly showFilterBar: boolean;
		readonly filterMode: FilterMode;
		readonly fields?: ReadonlyArray<FieldConfiguration>;
		readonly sectionData?: ReadonlyArray<SectionItem>;
		readonly enumeratedStringFilter?: EnumeratedStringFilterConfiguration;
	}

	export enum FilterMode {
		ALL = "all",
		ALL_WITH_META = "all_with_meta",
		ALL_COLUMNS = "all_columns",
		CUSTOM_LIST = "custom_list"
	}

	export interface EnumeratedStringFilterConfiguration {
		readonly fields: ReadonlyArray<FieldConfiguration>;
		readonly pagingSize?: number;
	}

	export interface FieldConfiguration {
		readonly fieldId: string;
		readonly subModel?: string;
	}

	export interface RowActionGroup {
		readonly actions?: ReadonlyArray<Button>;
	}

	export interface ConfirmationText {
		readonly title?: LocalizedModelText;
		readonly message?: LocalizedModelText;
	}

	export interface EventRowActivation {
		readonly type: "event";
		readonly event: string;
	}

	export namespace EventRowActivation {
		export function isAssignableFrom(activation: object): activation is EventRowActivation {
			return "type" in activation && (activation as EventRowActivation).type === "event";
		}
	}

	export interface NonInteractiveRowActivation {
		readonly type: "non_interactive";
	}

	export namespace NonInteractiveRowActivation {
		export function isAssignableFrom(activation: object): activation is NonInteractiveRowActivation {
			return "type" in activation && (activation as NonInteractiveRowActivation).type === "non_interactive";
		}
	}

	export type RowActivation = EventRowActivation | NonInteractiveRowActivation;

	export interface Triggerable extends Annotated {
		readonly event: string;
		readonly label?: LocalizedModelText;
		readonly description?: LocalizedModelText;
		readonly confirmation?: ConfirmationText;
		readonly icon?: Icon;
		readonly styles?: Styles;
	}

	export type ContextMenuItem = Triggerable;

	export interface Button extends Triggerable {
		readonly destructive?: boolean;
		readonly primary?: boolean;
		readonly labelHidden?: true;
	}

	export interface Annotated {
		readonly annotations?: Annotation[];
	}

	export interface Icon {
		readonly name: string;
		readonly theme?: IconTheme;
	}

	export interface ColumnAlignment {
		readonly header?: Alignment;
		readonly content?: Alignment;
	}

	export interface ColumnStyles {
		readonly header?: Styles;
		readonly content?: Styles;
	}

	export interface Alignment {
		readonly horizontal?: HorizontalAlignment;
		readonly vertical?: VerticalAlignment;
	}

	export enum HorizontalAlignment {
		LEFT = "left",
		CENTER = "center",
		RIGHT = "right"
	}

	export enum VerticalAlignment {
		TOP = "top",
		MIDDLE = "middle",
		BOTTOM = "bottom"
	}

	export interface MultiSelection {
		readonly collapseOption: MultiSelection.CollapseOption;
		readonly counterOption: MultiSelection.CounterOption;
		readonly selectionArea?: MultiSelection.SelectionArea;

		readonly buttons?: ReadonlyArray<Button>;

		readonly clearConfirmation?: {
			readonly enabled: true;
			readonly confirmation?: ConfirmationText;
		};
	}

	export namespace MultiSelection {
		export enum CounterOption {
			SIMPLE = "simple",
			NONE = "none"
		}

		export enum CollapseOption {
			COLLAPSIBLE_COLLAPSED = "collapsible_collapsed",
			COLLAPSIBLE_EXPANDED = "collapsible_expanded",
			NON_COLLAPSIBLE = "non_collapsible"
		}

		export enum SelectionArea {
			CHECKBOX = "checkbox",
			CHECKBOX_AND_ROW = "checkbox_and_row"
		}
	}

	export enum AttachmentDisplayMode {
		PREVIEW = "preview",
		ICON = "icon",
		FILE_NAME = "file_name",
		ICON_WITH_FILE_NAME = "icon_with_file_name"
	}

	export enum MultiSelectDisplayMode {
		COMMA_SEPARATED = "comma_separated",
		DEFAULT = "default"
	}

	export type IconTheme = "filled" | "outlined" | "rounded" | "custom";

	/**
	 * Top-level configuration for the Filter 2.0 system, typically derived from the OverviewModel.
	 *
	 * @experimental until 40.0.0 - API may change without semver guarantees.
	 */
	export interface NewFilterConfiguration {
		/** Ordered list of filter groups displayed in the Filter Selector. */
		readonly filterGroups: NewFilter.Group[];

		/** Filter Selector area: layout, visibility, header, trigger, kebab-menu options. */
		readonly filterSelector: NewFilter.FilterSelectorConfiguration;

		/**
		 * Global invert (NOT) applied to the combined result across the Filter Bar
		 * and the Filter Selector. Single source of truth — both UIs read and write
		 * the same value. Editable only from the Filter Selector kebab menu.
		 */
		readonly invert: Configurable<boolean>;

		/**
		 * Global join operator (AND/OR) across all filters. Single source of truth —
		 * both UIs read and write the same value. Editable only from the Filter
		 * Selector kebab menu.
		 */
		readonly joinOperator: Configurable<"and" | "or">;
	}

	/**
	 * Filter 2.0 model types. Defines JSON-driven configuration for field-based and query-based filters.
	 * Each filter type has its own namespace with `Options` and `Item`. Type guards live in `filter-model-utils.ts`.
	 *
	 * @experimental until 40.0.0 - API may change without semver guarantees.
	 */
	export namespace NewFilter {
		/** Logical group of filter items, rendered as a section in the Filter Selector. */
		export interface Group {
			readonly id: string;
			/** Author-facing name (editor/debug; not localized). */
			readonly name: string;
			readonly filterItems: Item[];
			/** Relationship traversal path for cross-document filtering. */
			readonly relationshipPath?: RelationshipContext[];
			readonly label?: LocalizedModelText;
			readonly icon?: Icon;
		}

		/**
		 * Filter Selector area configuration. Layout, visibility, header, trigger, and kebab-menu
		 * toggles flattened into the same wrapper — mirrors `FilterState.filterSelectorOptions`.
		 */
		export interface FilterSelectorConfiguration {
			/**
			 * Layout mode.
			 * - `"overlay"` — floats above content (default).
			 * - `"docked"` — sits inline beside engine content.
			 * - `"modal"` — centered modal overlay (Dual Pane, Dashboard tiles).
			 *
			 * Editor constraints when `viewMode === "modal"` (Editor-enforced; runtime does not validate):
			 * Filter Bar must not be modeled, `initialVisibility` must not be `"show"`, Pin/Unpin not exposed.
			 */
			readonly viewMode: "overlay" | "docked" | "modal";
			/** Visible on page load. Default: "hide". */
			readonly initialVisibility?: "show" | "hide";
			/** Subtitle below the "Filters" title. Recommended for Dual Pane / Dashboard surfaces. */
			readonly headerSubtitle?: LocalizedModelText;
			/** Filter trigger button. Omitted/`enabled: false` → default icon-only button. */
			readonly trigger?: Configurable<Pick<Button, "label" | "icon" | "labelHidden">>;
			readonly searchBar: Configurable<boolean>;
			/** "Show only filters with active criteria" mode in the selector. */
			readonly showSetFiltersOnly: Configurable<boolean>;
		}

		/** Relationship traversal path for filtering across related documents. */
		interface RelationshipContext {
			readonly relationship: string;
			readonly targetRole: string;
			/** CHILD for parent-child, LINK for associative. */
			readonly type?: "CHILD" | "LINK";
		}

		/** Union of all supported filter item types. */
		export type Item =
			| Boolean.Item
			| Confirm.Item
			| Enumeration.Item
			| MultiSelect.Item
			| String.Item
			| Number.Item
			| Date.Item
			| Time.Item
			| DateTime.Item
			| DateFragment.Item
			| DateRange.Item
			| Custom.Item
			| Query.Item;

		/** Discriminator literal union for {@link Item}. Drives exhaustive switch checks. */
		export type ItemType =
			| "boolean"
			| "confirm"
			| "enumeration"
			| "multi-select"
			| "string"
			| "number"
			| "date"
			| "time"
			| "dateTime"
			| "dateFragment"
			| "dateRange"
			| "custom"
			| "query";

		/** Common properties shared by all filter items. */
		export interface BaseItem extends OverviewModel.NewFilter.Options.Collapsed {
			readonly id: string;
			readonly type: ItemType;
			readonly label?: LocalizedModelText;
			readonly icon?: Icon;
			/** When `true`, prefer to appear as a chip in the Filter Bar when having enough space */
			readonly preferFilterBar?: true;
		}

		/** Filter item bound to a document field via `fieldId` in its options. */
		export interface FieldBasedItem<DataType extends ItemType, Options> extends BaseItem {
			readonly type: DataType;
			readonly options: Options;
		}

		/** Pre-resolved query operator the user can toggle on/off without editing criteria. */
		export namespace Query {
			export interface Options {
				readonly operator: DSQuery.Operator;
				/** Whether the query filter is active by default. */
				readonly enabled: Configurable<boolean>;
			}

			export interface Item extends BaseItem {
				readonly type: "query";
				readonly options: Options;
				readonly description?: LocalizedModelText;
			}
		}

		/** Shared options for all field-based filters: field ID binding and optional sub-model target. */
		interface FieldBasedOption {
			/**
			 * Element ID of the document field (matches `DocumentModel.Element.id`). Engine resolves
			 * to slash-delimited `FilterItemState.fieldPath`; controllers consume via
			 * `FilterControllerContext.fieldPath`.
			 */
			readonly fieldId: string;
			/** Sub-document model ID when filtering across sub-models. */
			readonly subModel?: string;
		}

		/** Reusable option mixins composed into individual filter Options interfaces. */
		export namespace Options {
			/** Mixin: section can be collapsed in the UI. */
			export interface Collapsed {
				readonly collapsed?: true;
			}

			/** Mixin: filter for undefined/null values. */
			export interface Empty {
				readonly empty: Configurable<boolean>;
			}

			/** Mixin: invert filter results. */
			export interface Invert {
				readonly invert: Configurable<boolean>;
			}
		}

		/** Available range modes for numeric, date, and time filters. */
		export type RangeOption = keyof RangeOptionCriteria<unknown>;

		/** Mixin for filter types offering range-based input (Number, Date, Time, etc.). */
		interface RangeConfiguration<Criteria> {
			readonly ranges: RangeOptionConfiguration<Criteria>;
		}

		/** Checkbox-style filter for boolean-like fields where the user confirms a single condition. */
		export namespace Confirm {
			export interface Options extends FieldBasedOption, Options.Empty {
				/** Default criteria. When `true`, filter starts checked. */
				readonly criteria?: true;
			}
			export type Item = FieldBasedItem<"confirm", Options>;
		}

		/** Filter for boolean fields with true/false/empty selection. */
		export namespace Boolean {
			export interface Options extends FieldBasedOption, Options.Empty {
				/** Default selected values (e.g. `[true]`, `[false]`, or `[true, false]`). */
				readonly criteria?: boolean[];
			}
			export type Item = FieldBasedItem<"boolean", Options>;
		}

		/** Multi-value filter for enumeration fields (checkboxes or compact dropdown). OR-joined. */
		export namespace Enumeration {
			export interface Options extends FieldBasedOption, Options.Empty, Options.Invert {
				readonly criteria?: string[];
				/** Display mode: "list" = checkboxes, "compact" = multi-select widget. */
				readonly viewMode: "list" | "compact";
				/** Values pinned at the top in defined order. Non-pinned go to "show more" if any pins exist. */
				readonly pinnedValues?: readonly string[];
			}

			export type Item = FieldBasedItem<"enumeration", Options>;
		}

		/** Multi-select filter with configurable AND/OR match semantics. */
		export namespace MultiSelect {
			export interface Options extends FieldBasedOption, Options.Empty, Options.Invert {
				readonly criteria?: string[];
				/** Display mode: "list" = checkboxes, "compact" = multi-select widget. */
				readonly viewMode: "list" | "compact";
				/** AND vs OR matching across selected values. */
				readonly matchOperator: Configurable<"and" | "or">;
				/** Values pinned at the top in defined order. Non-pinned go to "show more" if any pins exist. */
				readonly pinnedValues?: readonly string[];
			}

			export type Item = FieldBasedItem<"multi-select", Options>;
		}

		/** Free-text filter with configurable case sensitivity and exact/substring matching. */
		export namespace String {
			/**
			 * - "textField": free-text input (default). Case + Exact match configs apply.
			 * - "list": checkbox list of candidate values (server-fetched). Case/Exact N/A.
			 */
			export type ViewMode = "textField" | "list";

			export interface Options extends FieldBasedOption, Options.Empty, Options.Invert {
				/** Default search text (textField only). */
				readonly criteria?: string;
				/** Defaults to "textField" when omitted. */
				readonly viewMode?: ViewMode;
				/** Only applies when viewMode = "textField". */
				readonly caseSensitive: Configurable<boolean>;
				/** Exact vs substring matching. Only applies when viewMode = "textField". */
				readonly exactMatch: Configurable<boolean>;
			}

			export type Item = FieldBasedItem<"string", Options>;
		}

		/** Numeric range filter supporting fromTo, fromOnly, toOnly, and exact modes. */
		export namespace Number {
			export interface Options extends RangeConfiguration<number>, FieldBasedOption, Options.Empty, Options.Invert {}

			export type Item = FieldBasedItem<"number", Options>;
		}

		/** Date filter with range modes and configurable period granularity ("date", "year", "yearMonth", "month"). */
		export namespace Date {
			/** "month" = month within current year. */
			export type PeriodOption = "date" | "year" | "yearMonth" | "month";

			export interface Options extends RangeConfiguration<string>, FieldBasedOption, Options.Empty, Options.Invert {
				readonly periods: ListOptionConfiguration<PeriodOption>;
			}

			export type Item = FieldBasedItem<"date", Options>;
		}

		/** Time-only range filter (HH:mm format). */
		export namespace Time {
			export interface Options extends RangeConfiguration<string>, FieldBasedOption, Options.Empty, Options.Invert {}

			export type Item = FieldBasedItem<"time", Options>;
		}

		/** Combined date+time filter with configurable period granularity. */
		export namespace DateTime {
			/** "month" = month within current year. */
			export type PeriodOption = "dateTime" | "date" | "year" | "yearMonth" | "time" | "month";

			export interface Options extends RangeConfiguration<string>, FieldBasedOption, Options.Empty, Options.Invert {
				readonly periods: ListOptionConfiguration<PeriodOption>;
			}

			export type Item = FieldBasedItem<"dateTime", Options>;
		}

		/** Filter for partial date values (year/month fragments) using DATE_FRAGMENT_RANGE queries. */
		export namespace DateFragment {
			/**
			 * Allowed periods are constrained by the field's data-fragment format:
			 * - `"yyyy"` → `"year"`
			 * - `"MM"` → `"month"`
			 * - `"yyyy-MM"` → `"year" | "month" | "yearMonth"` (default `"yearMonth"`)
			 * - `"MM-dd"` → `"monthDay"` (custom format preview)
			 */
			export type PeriodOption = "year" | "month" | "yearMonth" | "monthDay";

			export interface Options extends RangeConfiguration<string>, FieldBasedOption, Options.Empty, Options.Invert {
				/** If only 1 entry (or omitted, falls back to the field's only allowed period), period section is hidden. */
				readonly periods?: ListOptionConfiguration<PeriodOption>;
			}

			export type Item = FieldBasedItem<"dateFragment", Options>;
		}

		/**
		 * Date-range filter for `DateRangeType` fields. The field's `format` determines which
		 * periods are valid:
		 * - `"yyyy"` → `"year"` (single)
		 * - `"MM"` → `"month"` (single)
		 * - `"yyyy-MM"` → `"year" | "month" | "yearMonth"`
		 * - `"yyyy-MM-dd"` → `"date"` (calendar picker)
		 * - `"MM-dd"` → `"monthDay"` (single)
		 *
		 * Query: emits `DateRangeOperator` via `QueryBuilder.dateRange(field, from, to)` —
		 * `from`/`to` are real ISO date strings (NOT fragment strings).
		 */
		export namespace DateRange {
			export type PeriodOption = "year" | "month" | "yearMonth" | "date" | "monthDay";

			export interface Options extends RangeConfiguration<string>, FieldBasedOption, Options.Empty, Options.Invert {
				/** If only 1 entry (or omitted, falls back to the field's only allowed period), period section is hidden. */
				readonly periods?: ListOptionConfiguration<PeriodOption>;
			}

			export type Item = FieldBasedItem<"dateRange", Options>;
		}

		/** Host-provided custom filter — rendering delegated to the host app. */
		export namespace Custom {
			export type Options = FieldBasedOption;

			export type Item = FieldBasedItem<"custom", Options>;
		}
	}
}

/**
 * Discriminated config flag. `enabled` controls whether the toggle is presented;
 * `value` carries its state when present.
 *
 * @experimental until 40.0.0 - API may change without semver guarantees.
 */
export type Configurable<T> = { readonly enabled: false } | { readonly enabled: true; readonly value: T };

/**
 * Per-option criteria-shape map. Local — keeps config-schema independent of runtime state.
 * @experimental until 40.0.0 - API may change without semver guarantees.
 */
export type RangeOptionCriteria<T> = {
	fromTo: { from: T; to: T };
	fromOnly: { from: T };
	toOnly: { to: T };
	exact: { exact: T };
};

/**
 * Config entry: option + optional default flag and pre-set criteria. Distributes over RangeOption.
 * @experimental until 40.0.0 - API may change without semver guarantees.
 */
export type RangeOptionEntry<
	Criteria,
	O extends OverviewModel.NewFilter.RangeOption = OverviewModel.NewFilter.RangeOption
> = O extends OverviewModel.NewFilter.RangeOption
	? { option: O; enabled: boolean } & (
			| { default: true; criteria?: RangeOptionCriteria<Criteria>[O] }
			| { default?: false }
		)
	: never;

/**
 * List of selectable range options where exactly one may be marked as the default.
 * Entries with `enabled: false` are skipped at runtime.
 * @experimental until 40.0.0 - API may change without semver guarantees.
 */
export type RangeOptionConfiguration<Criteria = unknown> = RangeOptionEntry<Criteria>[];

/**
 * List of selectable options where exactly one may be marked as the default.
 * Entries with `enabled: false` are skipped at runtime.
 * @experimental until 40.0.0 - API may change without semver guarantees.
 */
export type ListOptionConfiguration<OptionType> = {
	option: OptionType;
	default?: true;
	enabled: boolean;
}[];
