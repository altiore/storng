import {DataRes, ErrorOrInfo, GetScope, Route} from '@storng/common';

import {Store} from './store';
import {
	LoadedItem,
	RemoteHandlers,
	SubscriberType,
	SyncObjectType,
} from './types';

export const syncObj = <
	StoreState extends Record<string, StoreState[keyof StoreState]>,
	Routes extends Record<string, Route<any, any>> = any,
>(
	store: Store<StoreState>,
	routeScope: GetScope<Routes, keyof StoreState>,
	routeScopeHandlers: {
		[P in keyof Routes]: RemoteHandlers<StoreState[keyof StoreState]>;
	},
	initData?: Partial<StoreState[keyof StoreState]>,
	authStorage?: keyof StoreState,
): SyncObjectType<Routes, StoreState[keyof StoreState]> => {
	const storeName = routeScope.NAME;
	const persistStorage = store.local.simpleStorage();

	store.cache.addItem(storeName, initData);

	const res = {
		subscribe: async (
			subscriber: SubscriberType<StoreState[keyof StoreState]>,
		) => {
			try {
				await store.cache.subscribe(storeName, subscriber, persistStorage);
				return async () => await store.cache.unsubscribe(storeName, subscriber);
			} catch (err) {
				console.error(err);
			}
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
				let authData = {data: {}} as any;
				if (authStorage) {
					authData = await store.cache.getDataAsync(
						authStorage,
						persistStorage,
					);
				}
				const resData = await store.remote.fetch(route, authData, data);
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
	request: (s): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			isLoading: true,
		},
	}),
	success: (s, _, res: DataRes): LoadedItem<any> => ({
		data: {
			...s.data,
			...res.data,
		},
		loadingStatus: {
			error: undefined,
			isLoaded: true,
			isLoading: false,
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: (s, _, res: ErrorOrInfo): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			error: res,
			isLoading: false,
		},
	}),
} as RemoteHandlers;

syncObj.replace = {
	request: (s): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			isLoading: true,
		},
	}),
	success: (s, _, res: DataRes): LoadedItem<any> => ({
		data: res.data,
		loadingStatus: {
			error: undefined,
			isLoaded: true,
			isLoading: false,
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: (s, _, res: ErrorOrInfo): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			error: res,
			isLoading: false,
		},
	}),
} as RemoteHandlers;

syncObj.remove = {
	request: (s): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			isLoading: true,
		},
	}),
	success: (): LoadedItem<any> => ({
		data: {},
		loadingStatus: {
			error: undefined,
			isLoaded: false,
			isLoading: false,
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: (s, _, res: ErrorOrInfo): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			error: res,
			isLoading: false,
		},
	}),
} as RemoteHandlers;

syncObj.nothing = {
	request: (s): LoadedItem<any> => {
		return {
			data: s.data,
			loadingStatus: {
				...s.loadingStatus,
				isLoading: true,
			},
		};
	},
	success: (s): LoadedItem<any> => {
		return {
			data: s.data,
			loadingStatus: {
				...s.loadingStatus,
				error: undefined,
				isLoading: false,
			},
		};
	},
	// eslint-disable-next-line sort-keys
	failure: (s, _, res: ErrorOrInfo): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			error: res,
			isLoaded: false,
			isLoading: false,
		},
	}),
} as RemoteHandlers;
