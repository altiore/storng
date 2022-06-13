import {PersistStore, WeakStore} from '@storng/store';

export const syncObjectSimple = function <T extends Record<string, any>>(
	key: keyof T,
	initData: T[keyof T],
	persistStore?: PersistStore<T>,
	_remoteStorage?: unknown,
): {
	select: (data: T[keyof T]) => any;
	update: (
		getData: (prevState: Partial<T[keyof T]>) => Partial<T[keyof T]>,
	) => Promise<void>;
} {
	const store = WeakStore.getStore<T>(WeakStore.name);
	return {
		select: function (subscriber: (state: T[keyof T]) => any) {
			store.subscribe(key, subscriber, initData, persistStore).then().catch();

			return () => store.unsubscribe(key, subscriber, persistStore);
		},
		update: async function (getData: (prevState: T[keyof T]) => T[keyof T]) {
			return store.updateData(key, getData, persistStore);
		},
	};
};
