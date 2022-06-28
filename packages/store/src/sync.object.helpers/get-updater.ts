import {GetScope} from '@storng/common';
import {LoadedItem, MaybeRemoteData, Store} from '@storng/store';

import {PersistStore} from '../types';

const getAsyncUpdater =
	<T extends Record<keyof T, T[keyof T]>>(
		key: keyof T,
		handler: any,
		persistStore?: PersistStore<T>,
	) =>
	async (i: LoadedItem<T[keyof T]> | false) => {
		if (persistStore) {
			if (i) {
				await persistStore.setItem(key, i);
			} else {
				const prevData = await persistStore.getItem(key);

				const newData = handler(prevData);
				await persistStore.setItem(key, newData);
			}
		}
	};

export const getUpdater =
	<T extends Record<keyof T, T[keyof T]>>(
		scope: GetScope<any, keyof T> | keyof T,
		persistData: boolean,
	) =>
	(store: Store<T>) =>
	(handler: (i: LoadedItem<T[keyof T]>) => LoadedItem<T[keyof T]>): void => {
		const scopeName: keyof T =
			typeof scope === 'object' ? (scope.NAME as keyof T) : scope;
		const persistStorage = persistData
			? store.local.simpleStorage()
			: undefined;

		const asyncUpdater: (i: LoadedItem<T[keyof T]> | false) => Promise<void> =
			getAsyncUpdater(scopeName, handler, persistStorage as any);

		store.cache.updateData(scopeName, handler, asyncUpdater);
	};
