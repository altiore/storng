import {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';

import {SelectorType} from '@storng/store';

import {getStoreNames, getStoreSubscribers} from './connect-utils';
import {useIsMounted} from './hooks/use-is-mounted';
import {StoreContext} from './store.context';

export function useSelector<T = any, R = any>(
	selector: SelectorType<T>,
): T & {getOrDef: (def: R) => R} {
	const store = useContext(StoreContext);

	const storeData = useRef<{[key in string]: any}>({});
	const dependency = useRef<{
		deps: Array<string | SelectorType>;
		transform: (...args: any) => any;
	}>({deps: [], transform: (a) => a});

	const addDependency = useCallback(
		(deps: Array<string | SelectorType>, transform: (...args: any) => any) => {
			dependency.current = {deps, transform};
		},
		[dependency.current],
	);

	const [state, setState] = useState(() => selector.defaultValue);

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
				const depData = dependency.current;
				const transform = depData.transform;
				const depNames = getStoreNames(depData.deps);
				if (depNames.includes(name)) {
					return transform(...depData.deps.map(getDependency));
				} else {
					return s;
				}
			});
		},
		[getDependency, dependency.current],
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
		if (selector) {
			const storeSubscribers = getStoreSubscribers(selector);

			storeSubscribers.forEach(({storeName, subscribe}) => {
				if (!existingStoreNames.includes(storeName)) {
					existingStoreNames.push(storeName);
					const unsubscribe = subscribe(store)(getSubscriber(storeName));
					unsubscribeList.push(unsubscribe);
				}
			});

			addDependency(selector.dependencies, selector.transform);
		}

		return () => {
			unsubscribeList.forEach((unsubscribe) => unsubscribe());
		};
	}, [selector, store]);

	return useMemo<T & {getOrDef: (def: R) => R}>(() => {
		if (typeof state === 'function') {
			(state as any).getOrDef = (def: R) => {
				try {
					return state({
						correct: ({data}) => data ?? def,
						failure: () => def,
						loading: ({data}) => data ?? def,
						nothing: () => def,
					});
				} catch (e) {
					console.error(e);
					return def;
				}
			};
		}

		return state as any;
	}, [selector.defaultValue, state]);
}
