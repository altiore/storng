import React, {useCallback, useEffect, useRef, useState} from 'react';

import {SelectorType, Store} from '@storng/store';

import {useIsMounted} from './hooks/use-is-mounted';

interface IProps<T extends Record<string, T[keyof T]>> {
	store: Store<T>;
	selectors: {[key in string]: SelectorType};
	actions: any;
	component: any;
	componentProps: any;
}

const DEF_PROPS = {};

export const ConnectComponent = ({
	actions = DEF_PROPS,
	component: Component,
	componentProps = DEF_PROPS,
	selectors,
	store,
}: IProps<any>): JSX.Element => {
	const [prepActions] = useState(
		actions && actions
			? Object.keys(actions).reduce<any>((res, cur) => {
					res[cur] = actions[cur](store);
					return res;
			  }, {})
			: {},
	);

	const storeData = useRef<{[key in string]: any}>({});
	const dependencies = useRef<
		{[key in string]: {deps: string[]; transformer: (...args: any) => any}}
	>({});

	const addDependency = useCallback(
		(name: string, deps: string[], transformer: (...args: any) => any) => {
			dependencies.current = {
				...dependencies.current,
				[name]: {deps, transformer},
			};
		},
		[dependencies.current],
	);

	const [state, setState] = useState(
		Object.entries(selectors || {}).reduce<{[key in string]: any}>(
			(res, cur) => {
				res[cur[0]] = cur[1].def;
				return res;
			},
			{},
		),
	);

	const getMounted = useIsMounted();

	const updateState = useCallback(
		(name: string, value: any) => {
			if (!getMounted()) {
				return;
			}

			storeData.current = {
				...storeData.current,
				[name]: value,
			};

			setState((s) => {
				return Object.entries(s).reduce<{[key in string]: any}>((res, cur) => {
					const fieldName = cur[0];
					const dep = dependencies.current[fieldName];
					const deps = dep.deps;
					const transformer = dep.transformer;
					if (deps.includes(name)) {
						res[fieldName] = transformer(
							...deps.map((dep) =>
								dep === name ? value : storeData.current[dep],
							),
						);
					} else {
						res[fieldName] = cur[1];
					}
					return res;
				}, {});
			});
		},
		[dependencies.current, store, storeData.current],
	);

	const getSubscriber = useCallback(
		(storePropName: string): any => {
			return updateState.bind(undefined, storePropName);
		},
		[updateState],
	);

	useEffect(() => {
		const existingStoreNames: string[] = [];
		const subscribers: Array<() => void> = [];
		if (selectors) {
			Object.entries(selectors).forEach(([selectorName, selector]) => {
				const [transformer, tables, subs] = selector.func(store)(
					getSubscriber,
					existingStoreNames,
				);
				subscribers.push(...subs);
				addDependency(selectorName, tables, transformer);
			});
		}

		return () => {
			subscribers.forEach((unsubscribe) => unsubscribe());
		};
	}, [selectors, store]);

	return <Component {...prepActions} {...state} {...componentProps} />;
};
