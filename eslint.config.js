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

import Path from "node:path";
import Fs from "node:fs/promises";

import notice from "eslint-plugin-notice";
import stylistic from "@stylistic/eslint-plugin";
import { fixupPluginRules } from "@eslint/compat";
import perfectionist from "eslint-plugin-perfectionist";
import unusedImports from "eslint-plugin-unused-imports";
import filenameConfig from "eslint-plugin-filename-rules";
import typedReduxSaga from "@jambit/eslint-plugin-typed-redux-saga";

import { reactStrict } from "@com.mgmtp.a12.devtools/eslint-config";

/**
 * @param { import("eslint").Eslint.Plugin } plugin
 */
function injectRuleSchema(plugin) {
	const fixupPlugin = fixupPluginRules(plugin);
	const newRules = Object.fromEntries(
		Object.entries(fixupPlugin.rules).map(([ruleName, rule]) => [
			ruleName,
			{ ...rule, meta: { ...rule.meta, schema: false } }
		])
	);

	return { ...fixupPlugin, rules: newRules };
}

const license = await Fs.readFile(Path.join(import.meta.dirname, "license_header.txt"), "utf-8");

/** @type { import("eslint").Linter.Config[] } */
export default [
	...reactStrict,
	{
		name: "ignores",
		ignores: [
			"**/lib/",
			"**/dist/",
			"**/build/",
			"**/target/",
			"**/typedoc/",
			"**/coverage/",
			"**/resources/",
			"**/generated/",
			"**/playwright-report/",
			"**/test-results/",
			"**/*.skip-test.*",
			"**/worktrees/**",
			"extraction-tool/src/models/form-model.ts",
			"extraction-tool/src/models/overview-model.ts",
			"extraction-tool/src/internal/steps/index.ts"
		]
	},
	{
		name: "general",
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: import.meta.dirname
			}
		},
		linterOptions: {
			reportUnusedDisableDirectives: "error"
		},
		plugins: {
			notice: fixupPluginRules(notice),
			stylistic,
			perfectionist,
			"unused-imports": unusedImports,
			"typed-redux-saga": typedReduxSaga,
			filename: injectRuleSchema(filenameConfig)
		},
		rules: {
			"@typescript-eslint/no-namespace": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-empty-function": "warn",
			"@typescript-eslint/no-empty-interface": "warn",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
			curly: "error",
			"no-inner-declarations": "off",
			"react/display-name": "off",
			"react/prop-types": "off",
			"react/react-in-jsx-scope": "off",
			"react-hooks/refs": "off",
			"react-hooks/static-components": "off",
			"react-hooks/immutability": "off",
			"react-hooks/preserve-manual-memoization": "off",
			"notice/notice": ["error", { template: license, onNonMatchingHeader: "replace", chars: license.length }],
			eqeqeq: "error",
			"no-console": "error",
			"import/order": "off",
			"import/no-extraneous-dependencies": "error",
			"perfectionist/sort-imports": [
				"error",
				{
					type: "line-length",
					groups: ["side-effect", "builtin", "external", "a12", "core", "parent", ["sibling", "index"]],
					customGroups: [
						{ groupName: "a12", elementNamePattern: "^@com\\.mgmtp\\.a12\\." },
						{ groupName: "core", elementNamePattern: "\\..*/main" }
					]
				}
			],
			"perfectionist/sort-named-imports": ["error", { type: "line-length" }],
			"unused-imports/no-unused-imports": "error",
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: [
								"../**/internal/*",
								"!../**/internal/shared.js",
								"@com.mgmtp.a12*/**/internal/**",
								"@com.mgmtp.a12*/**/src/**"
							],
							message: "Importing from internal/src modules is not allowed. Please use the public API instead."
						},
						{
							group: ["redux-saga"],
							importNames: ["SagaIterator"],
							message: "Use 'SagaGenerator' from 'typed-redux-saga' instead."
						},
						{
							group: ["redux", "!./**"],
							importNames: ["AnyAction"],
							message: "AnyAction is deprecated in Redux 5. Use 'UnknownAction' or 'unknown' instead."
						}
					]
				}
			],

			"typed-redux-saga/delegate-effects": "error",
			"typed-redux-saga/use-typed-effects": "error",
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ prefer: "type-imports", fixStyle: "separate-type-imports" }
			],
			"@typescript-eslint/no-import-type-side-effects": "error",

			"stylistic/padding-line-between-statements": [
				"error",
				{ blankLine: "always", prev: "*", next: ["if", "while", "for", "switch", "try", "do", "return"] },
				{ blankLine: "always", prev: "block-like", next: "*" }
			]
		}
	},
	{
		name: "test",
		files: ["**/test/**", "**/*.test.ts"],
		rules: {
			"@typescript-eslint/no-non-null-assertion": "off",
			"import/no-extraneous-dependencies": ["error", { devDependencies: true }],
			"no-console": "off",
			"no-restricted-imports": ["error", { patterns: ["@com.mgmtp.a12*/**/internal/**", "@com.mgmtp.a12*/**/src/**"] }]
		}
	},
	{
		name: "internal",
		files: ["services-utils/**", "**/scripts/**", "documentation/**"],
		rules: {
			"no-console": "off",
			"import/no-extraneous-dependencies": "off"
		}
	}
];
