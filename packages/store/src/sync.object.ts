import {PersistStore, WeakStore} from '@storng/store';

export const syncObject = function <T extends Record<string, any>>(
	key: keyof T,
	initData: T[keyof T],
	persistStore?: PersistStore<T>,
	_remoteStorage?: unknown,
): {
	select: (data: T[keyof T]) => any;
	update: (state: Partial<T[keyof T]>) => Promise<void>;
	replace: (state: T[keyof T]) => Promise<void>;
} {
	const store = WeakStore.getStore<T>(WeakStore.name);
	return {
		replace: async function (state: T[keyof T]) {
			return store.updateData(key, state, true, persistStore);
		},
		select: function (subscriber: (state: T[keyof T]) => any) {
			store.subscribe(key, subscriber, initData, persistStore).then().catch();

			return () => store.unsubscribe(key, subscriber, persistStore);
		},
		update: async function (state: T[keyof T]) {
			return store.updateData(key, state, false, persistStore);
		},
	};
};
