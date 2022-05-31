import {PersistStore, WeakStore} from '~/store';

export const syncObject = function <T extends Record<string, any>>(
	key: keyof T,
	initData: T[keyof T],
	persistStore: PersistStore<T>,
	_remoteStorage?: unknown,
): {
	select: (data: T[keyof T]) => any;
	update: (state: T[keyof T]) => Promise<void>;
	replace: (state: T[keyof T]) => Promise<void>;
} {
	const store = WeakStore.getStore<T>();
	return {
		replace: async function (state: T[keyof T]) {
			return store.updateData(key, persistStore, state, true);
		},
		select: function (subscriber: (state: T[keyof T]) => any) {
			store.subscribe(key, persistStore, subscriber, initData).then().catch();

			return () => store.unsubscribe(key, persistStore, subscriber);
		},
		update: async function (state: T[keyof T]) {
			return store.updateData(key, persistStore, state);
		},
	};
};
