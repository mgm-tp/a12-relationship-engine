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
 *
 * This is a temporary solution to be used in FormEngineModal of Relationships.
 */

import React, { Component } from "react";
import { connect, Provider } from "react-redux";
import { type Store, createStore, type Reducer, applyMiddleware, type Middleware } from "redux";

import type { Locale } from "@com.mgmtp.a12.utils/utils-localization";
import type { DocumentModel, IGeneratedCodeAccessor } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import {
	type FormModel,
	type EngineState,
	createEngineStore,
	FormEngineRenderer,
	type DefaultOwnProps,
	createCombinedReducer,
	defaultMapStateToProps,
	type DefaultStateProps,
	createEngineMiddlewares,
	type DefaultDispatchProps,
	defaultMapDispatchToProps
} from "@com.mgmtp.a12.formengine/formengine-core";

// Attention: All of these props are for initialization only - changes are ignored!
/** @internal */
export interface FormEngineProps {
	readonly documentModel: DocumentModel;
	readonly formModel: FormModel;
	readonly validatorProvider: IGeneratedCodeAccessor;
	readonly state: {
		readonly document: object;
		readonly locale: Locale;
		readonly readonly?: boolean;
	};

	readonly additionalMiddlewares?: Middleware[];
}

// Stub `activities: {}` so FE UniqueConstraintViolationBar (which reads
// `state.activities` via ActivitySelectors.error) does not throw against this private engine-only store.
function configureStore(initialState: EngineState, additionalMiddlewares?: Middleware[]) {
	const engineReducer = createCombinedReducer(initialState);
	const rootReducer: Reducer<EngineState> = (state, action) => {
		const next = engineReducer(state, action);

		return { ...next, activities: {} };
	};

	return createStore(rootReducer, applyMiddleware(...(additionalMiddlewares || []), ...createEngineMiddlewares()));
}

const FormEngineConnected = connect<DefaultStateProps, DefaultDispatchProps, DefaultOwnProps, EngineState>(
	defaultMapStateToProps,
	defaultMapDispatchToProps
)(FormEngineRenderer);

/** @internal */
export class StandaloneFormEngine extends Component<FormEngineProps> {
	private store: Store<EngineState>;

	constructor(props: FormEngineProps) {
		super(props);

		this.store = configureStore(
			createEngineStore({
				locale: props.state.locale,
				data: { document: props.state.document },
				models: {
					formModel: props.formModel,
					documentModel: props.documentModel,
					validatorProvider: props.validatorProvider
				},
				ui: {
					readonly: props.state.readonly
				}
			}),
			props.additionalMiddlewares
		);
	}

	render(): React.ReactNode {
		return (
			<Provider store={this.store}>
				<FormEngineConnected />
			</Provider>
		);
	}
}
