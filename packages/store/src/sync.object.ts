import {PersistStore, WeakStore} from '@storng/store';

export const syncObject = function <T extends Record<string, any>>(
	key: keyof T,
	initData: T[keyof T],
	getPersistStore: (name: string) => PersistStore<T>,
	name: string,
	_remoteStorage?: unknown,
): {
	select: (data: T[keyof T]) => any;
	update: (state: Partial<T[keyof T]>) => Promise<void>;
	replace: (state: T[keyof T]) => Promise<void>;
} {
	console.log('use _remoteStorage', _remoteStorage);
	const store = WeakStore.getStore<T>(name);
	return {
		replace: async function (state: T[keyof T]) {
			const persistStore = getPersistStore(store.name);
			return store.updateData(key, persistStore, state, true);
		},
		select: function (subscriber: (state: T[keyof T]) => any) {
			const persistStore = getPersistStore(store.name);
			store.subscribe(key, persistStore, subscriber, initData).then().catch();

			return () => store.unsubscribe(key, persistStore, subscriber);
		},
		update: async function (state: T[keyof T]) {
			const persistStore = getPersistStore(store.name);
			return store.updateData(key, persistStore, state);
		},
	};
};
