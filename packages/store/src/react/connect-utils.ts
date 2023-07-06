import {SelectorType, Store} from '@storng/store';

export const getStoreNames = (
	deps: Array<string | SelectorType>,
	storeNames: string[] = [],
): Array<string> => {
	deps.forEach((dep) => {
		if (typeof dep === 'string') {
			if (!storeNames.includes(dep)) {
				storeNames.push(dep);
			}
		} else {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			getStoreNames(dep.dependencies, storeNames);
		}
	});

	return storeNames;
};

export const getStoreSubscribers = (
	selector: SelectorType,
	storeSubscribers: Array<{storeName: string; subscribe: any}> = [],
): Array<{storeName: string; subscribe: (store: Store<any>) => any}> => {
	if (selector.subscribe) {
		if (
			selector.dependencies.length > 1 ||
			typeof selector.dependencies[0] !== 'string'
		) {
			throw new Error(
				'Тип селекторов не поддерживается - ' +
					JSON.stringify({
						dependencies: selector.dependencies,
					}),
			);
		}
		const storeName = selector.dependencies[0] as string;
		if (!storeSubscribers.find((el) => el.storeName === storeName)) {
			storeSubscribers.push({storeName, subscribe: selector.subscribe});
		}
	} else {
		selector.dependencies.forEach((s) => {
			if (typeof s !== 'string') {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				getStoreSubscribers(s, storeSubscribers);
			}
		});
	}

	return storeSubscribers;
};
