import {GetScope, Route} from '@storng/common';
import {LoadedData, ScopeHandlers, Store} from '@storng/store';

const requestHandler =
	(handler, req, initData, route): any =>
	(state): any => {
		return handler.request(state, initData, {
			req,
			route,
		});
	};

const successHandler =
	(handler, req, initData): any =>
	(state): any => {
		try {
			return handler.success(state, req || initData);
		} catch (err) {
			return handler.failure(state, initData, {
				res: {message: String(err), ok: false},
			});
		}
	};

const remoteSuccessHandler =
	(handler, initData, resData, route): any =>
	(state): any => {
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

const remoteFailureHandler =
	(handler, initData, resData, route): any =>
	(state): any =>
		handler.failure(state, initData, {
			res: resData,
			route,
		});

const removeErrorHandler = (state) => ({
	data: state.data,
	loadingStatus: {
		...state.loadingStatus,
		error: undefined,
		isLoaded: Boolean(state?.loadingStatus?.isLoaded),
		isLoading: false,
	},
});

const catchFailureHandler =
	(handler, initData, err): any =>
	(state): any =>
		handler.failure(
			state,
			initData,
			err?.ok === false ? err : {message: String(err), ok: false},
		);

export const prepareActions = <
	T extends Record<string, T[keyof T]>,
	Key extends keyof T = keyof T,
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	OtherRoutes extends Record<string, any> = Record<string, never>,
>(
	result: unknown,
	scope: Key | GetScope<Routes, Key>,
	scopeHandlers: ScopeHandlers<T, Key, Routes, OtherRoutes>,
	getUpdater: (
		store: Store<T>,
	) => (
		item: (i: LoadedData<T[keyof T]>) => LoadedData<T[keyof T]>,
	) => Promise<void>,
	initData?: Partial<T[Key]>,
): void => {
	Object.entries(scopeHandlers).forEach(([handlerName, handler]) => {
		(result as any)[handlerName] = (store: Store<T>) => async (req) => {
			const updater: (
				item: (i: LoadedData<T[keyof T]>) => LoadedData<T[keyof T]>,
			) => Promise<void> = getUpdater(store);

			const isApiReq = Boolean(typeof scope === 'object' && scope[handlerName]);
			if (isApiReq) {
				let isError = false;
				let actionResult: any;
				const route = scope[handlerName];
				await updater(requestHandler(handler, req, initData, route));
				try {
					const resData = await store.remote.fetch(route, req);
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
							updater(removeErrorHandler);
						}, store.autoRemoveErrorIn);
					}
				}
				return actionResult;
			} else {
				await updater(successHandler(handler, req, initData));
			}
		};
	});
};
