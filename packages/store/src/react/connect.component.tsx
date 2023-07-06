import React, {useCallback, useEffect, useRef, useState} from 'react';

import {SelectorType, Store} from '@storng/store';

import {getStoreNames, getStoreSubscribers} from './connect-utils';
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
		{
			[key in string]: {
				deps: Array<string | SelectorType>;
				transform: (...args: any) => any;
			};
		}
	>({});

	const addDependency = useCallback(
		(
			name: string,
			deps: Array<string | SelectorType>,
			transform: (...args: any) => any,
		) => {
			dependencies.current = {
				...(dependencies.current || {}),
				[name]: {deps, transform},
			};
		},
		[dependencies.current],
	);

	const [state, setState] = useState(
		Object.entries(selectors || {}).reduce<{[key in string]: any}>(
			(res, cur) => {
				res[cur[0]] = cur[1].defaultValue;
				return res;
			},
			{},
		),
	);

	const getMounted = useIsMounted();

	const getDependency = useCallback(
		(selector: string | SelectorType): any => {
			if (typeof selector === 'string') {
				return storeData.current[selector];
			} else {
				return selector.transform(...selector.dependencies.map(getDependency));
			}
		},
		[storeData.current],
	);

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
					const depData = dependencies.current[fieldName];
					const transform = depData.transform;
					const depNames = getStoreNames(depData.deps);
					if (depNames.includes(name)) {
						res[fieldName] = transform(...depData.deps.map(getDependency));
					} else {
						res[fieldName] = cur[1];
					}
					return res;
				}, {});
			});
		},
		[getDependency, dependencies.current],
	);

	const getSubscriber = useCallback(
		(storePropName: string): any => {
			return updateState.bind(undefined, storePropName);
		},
		[updateState],
	);

	useEffect(() => {
		const existingStoreNames: string[] = [];
		const unsubscribeList: Array<() => void> = [];
		if (selectors) {
			Object.entries(selectors).forEach(([selectorName, selector]) => {
				const storeSubscribers = getStoreSubscribers(selector);

				storeSubscribers.forEach(({storeName, subscribe}) => {
					if (!existingStoreNames.includes(storeName)) {
						existingStoreNames.push(storeName);
						const unsubscribe = subscribe(store)(getSubscriber(storeName));
						unsubscribeList.push(unsubscribe);
					}
				});

				addDependency(selectorName, selector.dependencies, selector.transform);
			});
		}

		return () => {
			unsubscribeList.forEach((unsubscribe) => unsubscribe());
		};
	}, [selectors, store]);

	return <Component {...prepActions} {...state} {...componentProps} />;
};
