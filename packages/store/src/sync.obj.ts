import {DataRes, ErrorOrInfo, GetScope, Route} from '@storng/common';

import {Store} from './store';
import {
	LoadedItem,
	RemoteHandlers,
	ScopeHandlers,
	SubscriberType,
	SyncObjectType,
} from './types';
import {deepAssign} from './utils';

const requestHandler = (handler, req, initData, route) => (state) =>
	handler.request(state, initData, {
		req,
		route,
	});

const successHandler = (handler, req, initData) => (state) => {
	try {
		return handler.success(state, req || initData);
	} catch (err) {
		return handler.failure(state, initData, {
			res: {message: String(err), ok: false},
		});
	}
};

const remoteSuccessHandler = (handler, initData, resData, route) => (state) => {
	try {
		return handler.success(state, initData, {
			res: resData,
			route,
		});
	} catch (err) {
		return handler.failure(state, initData, {
			res: {message: String(err), ok: false},
			route,
		});
	}
};

const remoteFailureHandler = (handler, initData, resData, route) => (state) =>
	handler.failure(state, initData, {
		res: resData,
		route,
	});

const catchFailureHandler = (handler, initData, err) => (state) =>
	handler.failure(
		state,
		initData,
		err?.ok === false ? err : {message: String(err), ok: false},
	);

export const syncObj = <
	StoreState extends Record<string, StoreState[keyof StoreState]>,
	Key extends keyof StoreState = keyof StoreState,
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	OtherRoutes extends string = never,
>(
	store: Store<StoreState>,
	scope: GetScope<Routes, Key> | Key,
	scopeHandlers: ScopeHandlers<StoreState, Key, Routes, OtherRoutes>,
	initData?: Partial<StoreState[Key]>,
	authStorage?: Key,
): SyncObjectType<Routes, StoreState[Key], OtherRoutes> => {
	const storeName: Key = typeof scope === 'object' ? scope.NAME : scope;
	const persistStorage = store.local.simpleStorage();

	store.cache.addItem(storeName, initData);

	const result = {
		subscribe: async (subscriber: SubscriberType<StoreState[Key]>) => {
			try {
				await store.cache.subscribe(storeName, subscriber, persistStorage);
				return async () => await store.cache.unsubscribe(storeName, subscriber);
			} catch (err) {
				console.error(err);
			}
		},
	};

	Object.entries(scopeHandlers).forEach(([handlerName, handler]) => {
		(result as any)[handlerName] = async (req) => {
			if (typeof scope === 'object' && scope[handlerName]) {
				const route = scope[handlerName];
				await store.cache.updateData(
					storeName,
					requestHandler(handler, req, initData, route),
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
					const resData = await store.remote.fetch(route, authData, req);
					if (resData.ok) {
						await store.cache.updateData(
							storeName,
							remoteSuccessHandler(handler, initData, resData, route),
							persistStorage,
						);
					} else {
						await store.cache.updateData(
							storeName,
							remoteFailureHandler(handler, initData, resData, route),
							persistStorage,
						);
					}
					return resData;
				} catch (err) {
					await store.cache.updateData(
						storeName,
						catchFailureHandler(handler, initData, err),
						persistStorage,
					);
					return err;
				}
			} else {
				await store.cache.updateData(
					storeName,
					successHandler(handler, req, initData),
					persistStorage,
				);
			}
		};
	});

	return result as any as SyncObjectType<Routes, StoreState[Key], OtherRoutes>;
};

syncObj.update = {
	request: (s): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			isLoading: true,
		},
	}),
	success: (
		s,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedItem<any> => ({
		data: {
			...s.data,
			...(remote?.res.data || data || {}),
		},
		loadingStatus: {
			error: undefined,
			isLoaded: true,
			isLoading: false,
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: (
		s,
		_,
		remote: {res: ErrorOrInfo; route: Route},
	): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			error: remote.res,
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
	success: (
		s,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedItem<any> => ({
		data: remote?.res.data || data || {},
		loadingStatus: {
			error: undefined,
			isLoaded: true,
			isLoading: false,
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: (
		s,
		_,
		remote: {res: ErrorOrInfo; route: Route},
	): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			error: remote.res,
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
	success: (s, data): LoadedItem<any> => ({
		data: data || {},
		loadingStatus: {
			error: undefined,
			isLoaded: false,
			isLoading: false,
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: (
		s,
		_,
		remote: {res: ErrorOrInfo; route: Route},
	): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			error: remote.res,
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
	failure: (
		s,
		_,
		remote: {res: ErrorOrInfo; route: Route},
	): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			error: remote.res,
			isLoaded: false,
			isLoading: false,
		},
	}),
} as RemoteHandlers;

syncObj.deepMerge = {
	request: (s): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			isLoading: true,
		},
	}),
	success: (
		s,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedItem<any> => ({
		data: deepAssign(s.data, remote?.res.data || data || {}),
		loadingStatus: {
			error: undefined,
			isLoaded: true,
			isLoading: false,
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: (
		s,
		_,
		remote: {res: ErrorOrInfo; route: Route},
	): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			error: remote.res,
			isLoading: false,
		},
	}),
} as RemoteHandlers;
