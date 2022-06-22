import {DataRes, ErrorOrInfo, GetScope, Route} from '@storng/common';
import {
	LoadedItem,
	MaybeRemoteData,
	RemoteHandlers,
	ScopeHandlers,
	Store,
	SubscriberType,
} from '@storng/store';

import {getObjFunc} from './react/get.func-data';
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

const removeErrorHandler = (state) => ({
	data: state.data,
	loadingStatus: {
		error: undefined,
		isLoaded: Boolean(state?.loadingStatus?.isLoaded),
		isLoading: false,
	},
});

const catchFailureHandler = (handler, initData, err) => (state) =>
	handler.failure(
		state,
		initData,
		err?.ok === false ? err : {message: String(err), ok: false},
	);

const nothingHandler = (s) => s;
const defRestorePreparation = (s: LoadedItem<any>) => {
	if (typeof s?.loadingStatus?.isLoading === 'boolean') {
		return {
			data: {...s.data},
			loadingStatus: {
				error: undefined,
				isLoaded: s.loadingStatus.isLoaded,
				isLoading: false,
			},
		};
	}

	console.error('NO DATA >>>>>>', s);
	return s;
};

export function syncObject<
	StoreState extends Record<string, StoreState[keyof StoreState]>,
	Key extends keyof StoreState = keyof StoreState,
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	OtherRoutes extends Record<string, any> = Record<string, never>,
>(
	scope: GetScope<Routes, Key> | Key,
	scopeHandlers: ScopeHandlers<StoreState, Key, Routes, OtherRoutes>,
	initData?: Partial<StoreState[Key]>,
	persistData?: boolean,
	restorePreparation = defRestorePreparation,
): any {
	const result =
		(store: Store<StoreState>) =>
		async (subscriber: SubscriberType<StoreState[Key]>) => {
			try {
				const storeName: Key =
					typeof scope === 'object' ? (scope.NAME as Key) : scope;
				const persistStorage = store.local.simpleStorage();

				store.cache.addItem(storeName, initData);
				await store.cache.subscribe<
					MaybeRemoteData<LoadedItem<StoreState[Key]>>
				>(
					storeName,
					subscriber,
					persistStorage,
					getObjFunc,
					restorePreparation,
				);
				return async () => await store.cache.unsubscribe(storeName, subscriber);
			} catch (err) {
				console.error(err);
			}
		};

	Object.entries(scopeHandlers).forEach(([handlerName, handler]) => {
		(result as any)[handlerName] =
			(store: Store<StoreState>) => async (req) => {
				const storeName: Key =
					typeof scope === 'object' ? (scope.NAME as Key) : scope;
				const persistStorage = store.local.simpleStorage();

				const shouldPersistStore =
					typeof persistData === 'boolean'
						? persistData
						: typeof scope === 'object';
				const updater = async (handler) =>
					store.cache.updateData(
						storeName,
						handler,
						shouldPersistStore ? persistStorage : undefined,
						getObjFunc,
					);

				const isApiReq = Boolean(
					typeof scope === 'object' && scope[handlerName],
				);
				if (isApiReq) {
					let isError = false;
					let actionResult: any;
					const route = scope[handlerName];
					await updater(requestHandler(handler, req, initData, route));
					try {
						const authData = await store.cache.getAuthData(
							persistStorage,
							store.authStorage,
						);
						const resData = await store.remote.fetch(route, authData, req);
						if (resData.ok) {
							await updater(
								remoteSuccessHandler(handler, initData, resData, route),
							);
						} else {
							await updater(
								remoteFailureHandler(handler, initData, resData, route),
							);
							isError = true;
						}
						actionResult = resData;
					} catch (err) {
						await updater(catchFailureHandler(handler, initData, err));
						actionResult = err;
						isError = true;
					} finally {
						if (store.autoRemoveErrorIn && isError) {
							// автоматически удалять ошибку через 15 секунд
							setTimeout(() => {
								updater(removeErrorHandler).then().catch(console.error);
							}, store.autoRemoveErrorIn);
						}
					}
					return actionResult;
				} else {
					await updater(successHandler(handler, req, initData));
				}
			};
	});

	return result as any;
}

syncObject.update = {
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

syncObject.replace = {
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

syncObject.remove = {
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

syncObject.nothing = {
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

syncObject.deepMerge = {
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

syncObject.custom = <T, D = any>(cb: (a: T, data: D) => T): RemoteHandlers => ({
	request: nothingHandler,
	success: (s: LoadedItem<T>, data): LoadedItem<T> => {
		return {
			data: cb(s.data as T, data as any),
			loadingStatus: s.loadingStatus,
		};
	},
	// eslint-disable-next-line sort-keys
	failure: nothingHandler,
});
