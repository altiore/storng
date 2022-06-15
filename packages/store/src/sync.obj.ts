import {DataRes, ErrorRes, GetScope, InfoRes, Route} from '@storng/common';

import {Store} from './store';
import {LoadedItem, RemoteHandlers, SyncObjectType} from './types';

export const syncObj = <
	StoreState extends Record<string, StoreState[keyof StoreState]>,
	Routes extends Record<string, Route<any, any>> = any,
>(
	store: Store<StoreState>,
	routeScope: GetScope<Routes>,
	routeScopeHandlers: {
		[P in keyof Routes]: RemoteHandlers<StoreState[keyof StoreState]>;
	},
	initData?: Partial<StoreState[keyof StoreState]>,
): SyncObjectType<Routes, StoreState[keyof StoreState]> => {
	const storeName = routeScope.NAME;
	const persistStorage = store.local.simpleStorage();

	store.cache.addItem(storeName, initData);

	const res = {
		select: async function (
			subscriber: (state: LoadedItem<StoreState[keyof StoreState]>) => any,
		) {
			try {
				await store.cache.subscribe(storeName, subscriber, persistStorage);
			} catch (err) {
				console.error(err);
			}

			return () => store.cache.unsubscribe(storeName, subscriber);
		},
	};

	Object.entries(routeScopeHandlers).forEach(([handlerName, handler]) => {
		const route = routeScope[handlerName];
		(res as any)[handlerName] = async (data) => {
			await store.cache.updateData(
				storeName,
				(state) => handler.request(state, data, route),
				persistStorage,
			);
			try {
				const resData = await store.remote.fetch(route, data);
				if (resData?.ok) {
					await store.cache.updateData(
						storeName,
						(state) => handler.success(state, data, resData),
						persistStorage,
					);
				} else {
					await store.cache.updateData(
						storeName,
						(state) => handler.failure(state, data, resData),
						persistStorage,
					);
				}
				return resData;
			} catch (err) {
				await store.cache.updateData(
					storeName,
					(state) =>
						handler.failure(
							state,
							data,
							err?.ok === false ? err : {error: err, ok: false},
						),
					persistStorage,
				);
				return err;
			}
		};
	});

	return res as any;
};

syncObj.update = {
	request: (s) => ({
		...s,
		isLoading: true,
	}),
	success: (s, _, res: DataRes) => ({
		...s,
		data: {
			...s.data,
			...res.data,
		},
		error: undefined,
		isLoaded: true,
		isLoading: false,
	}),
	// eslint-disable-next-line sort-keys
	failure: (s, _, res: ErrorRes | InfoRes) => ({
		...s,
		error: (res as InfoRes)?.message ?? (res as ErrorRes).errors,
		isLoading: false,
	}),
} as RemoteHandlers;

syncObj.replace = {
	request: (s) => ({
		...s,
		isLoading: true,
	}),
	success: (s, _, res: DataRes) => ({
		...s,
		data: res.data,
		error: undefined,
		isLoaded: true,
		isLoading: false,
	}),
	// eslint-disable-next-line sort-keys
	failure: (s, _, res: ErrorRes | InfoRes) => ({
		...s,
		error: (res as InfoRes)?.message ?? (res as ErrorRes).errors,
		isLoading: false,
	}),
} as RemoteHandlers;

syncObj.nothing = {
	request: (s) => {
		return {
			...s,
			isLoading: true,
		};
	},
	success: (s) => {
		return {
			...s,
			error: undefined,
			isLoading: false,
		};
	},
	// eslint-disable-next-line sort-keys
	failure: (s, _, res: ErrorRes | InfoRes) => ({
		...s,
		error: (res as InfoRes)?.message ?? (res as ErrorRes)?.errors,
		isLoaded: false,
		isLoading: false,
	}),
} as RemoteHandlers;
