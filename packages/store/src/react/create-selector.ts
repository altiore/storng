import {SelectorType, Store, StructureType} from '@storng/store';

type Descriptor = {
	type: StructureType;
	pointer: [string, string, string] | [string, string];
};

const doNothing = (s) => s;

const getSelectorObj = (def, func) => ({def, func});

export const createSelector = <R = any, T = any>(
	transformer: (...args: Array<any>) => R,
	dependencies: Array<Descriptor>,
	def?: T,
	onFetch?: (store: Store<any>) => () => Promise<any>,
): {def: typeof def; func: SelectorType} =>
	getSelectorObj(
		transformer(def),
		(store: Store<any>) =>
			(
				getSubscriber: (fieldName: string) => (data: R) => void,
				existingStoreNames: string[],
			) => {
				const propNames: string[] = [];
				const subscribers = dependencies
					.map((dep) => {
						if (existingStoreNames.includes(dep.pointer[1])) {
							return false;
						}
						const storeName = dep.pointer[1];

						existingStoreNames.push(storeName);
						if ([StructureType.LIST, StructureType.ITEM].includes(dep.type)) {
							if (dep.type === StructureType.LIST) {
								propNames.push(storeName);
								const persistStorage = store.local.listStorage();
								const subscriber = getSubscriber(storeName);
								store.subscribeList<any>(
									storeName,
									subscriber,
									doNothing,
									undefined,
									persistStorage,
									onFetch,
								);
								return () => store.unsubscribe(storeName, subscriber);
							}

							if (dep.type === StructureType.ITEM) {
								propNames.push(storeName);
								const persistStorage = store.local.itemStorage();
								const subscriber = getSubscriber(storeName);
								store.subscribe<any>(
									storeName,
									subscriber,
									doNothing,
									undefined,
									persistStorage,
									def,
								);
								return () => store.unsubscribe(storeName, subscriber);
							}
						} else {
							console.error('Другие типы селекторов пока не поддерживаются');
						}
					})
					.filter(Boolean);

				return [transformer, propNames, subscribers];
			},
	);
