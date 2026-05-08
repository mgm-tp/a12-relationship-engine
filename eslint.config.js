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
import unusedImports from "eslint-plugin-unused-imports";
import typedReduxSaga from "@jambit/eslint-plugin-typed-redux-saga";

import { reactStrict } from "@com.mgmtp.a12.devtools/eslint-config";

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
			"**/node_modules/",
			"**/coverage/",
			"**/resources/",
			"**/generated/",
			"**/*.skip-test.*"
		]
	},
	{
		name: "general",
		languageOptions: {
			parserOptions: {
				project: ["*/tsconfig.eslint.json"],
				tsconfigRootDir: import.meta.dirname
			}
		},
		linterOptions: {
			reportUnusedDisableDirectives: "error"
		},
		plugins: {
			notice,
			"unused-imports": unusedImports,
			"typed-redux-saga": typedReduxSaga
		},
		rules: {
			"react-hooks/preserve-manual-memoization": "warn",
			"react-hooks/static-components": "warn",
			"react-hooks/refs": "warn",
			"@typescript-eslint/no-namespace": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-empty-function": "warn",
			"@typescript-eslint/no-empty-interface": "warn",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
			curly: "error",
			"no-console": "error",
			"no-inner-declarations": "off",
			"react/display-name": "off",
			"react/prop-types": "off",
			"react/react-in-jsx-scope": "off",
			"notice/notice": ["error", { template: license, onNonMatchingHeader: "replace", chars: license.length }],
			eqeqeq: "error",
			"import/no-extraneous-dependencies": "error",
			"unused-imports/no-unused-imports": "error",
			"no-restricted-imports": [
				"error",
				{
					patterns: ["@com.mgmtp.a12*/**/internal/**", "@com.mgmtp.a12*/**/src/**"]
				}
			],
			"typed-redux-saga/delegate-effects": "error",
			"typed-redux-saga/use-typed-effects": "error",
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ prefer: "type-imports", fixStyle: "inline-type-imports" }
			]
		}
	},
	{
		name: "test",
		files: ["**/test/**"],
		rules: {
			"react-hooks/rules-of-hooks": "off",
			"react/react-in-jsx-scope": "off",
			"import/no-extraneous-dependencies": ["error", { devDependencies: true }],
			"@typescript-eslint/no-unused-expressions": "off",
			"no-restricted-imports": ["error", { patterns: ["@com.mgmtp.a12*/**/internal/**", "@com.mgmtp.a12*/**/src/**"] }]
		}
	},
	{
		name: "documentation",
		files: ["documentation/**"],
		rules: {
			"import/no-extraneous-dependencies": "off"
		}
	},
	{
		name: "scripts",
		files: ["**/scripts/**", "services-utils/**"],
		rules: {
			"@typescript-eslint/no-require-imports": ["off"],
			"no-console": "off"
		}
	}
];
