import {GetScope, Method, Route, RouteScope} from '@storng/common';
import {PersistStore, WeakStore} from '@storng/store';

import {ApiStore} from './api-store';

type AuthRoutes = {
	login: Route<{email: string; password: string}, any>;
	logout: Route;
};

const authScope = RouteScope<AuthRoutes>({
	BASE: '/auth',
	NAME: 'Авторизация',
	URL: {
		login: {
			method: Method.PATCH,
			path: '/login',
			requiredParams: ['email', 'password'],
		},
		logout: {method: Method.POST, path: '/logout'},
	},
});

type AsyncData<Data> = {
	data: Partial<Data>;
	error?: any;
	isLoading: boolean;
	isLoaded: boolean;
};

type RemoteHandlers<Data> = {
	request: (data: AsyncData<Data>) => AsyncData<Data>;
	success: (data: AsyncData<Data>, response: Response) => AsyncData<Data>;
	failure: (data: AsyncData<Data>) => AsyncData<Data>;
};

export const syncApiObject = <
	Key extends string,
	Data extends Record<string, any>,
	Routes extends Record<string, Route<any, any>> = any,
>(
	store: WeakStore<any>,
	api: ApiStore<any>,
	key: string,
	initData: Partial<Data>,
	routeScope: GetScope<Routes>,
	handlers: {[P in keyof Routes]: RemoteHandlers<Data>},
	persistStore?: PersistStore<any>,
) => {
	const res: {[P in keyof Routes]: any} & {
		select: (subscriber: (state: Data) => any) => Promise<() => Promise<void>>;
	} = {
		select: async function (subscriber: (state: Data) => any) {
			try {
				await store.subscribe(key as Key, subscriber, initData, persistStore);
			} catch (err) {
				console.error(err);
			}

			return () => store.unsubscribe(key as Key, subscriber, persistStore);
		},
	} as any;

	Object.entries(handlers).forEach(([handlerName, handler]) => {
		(res as any)[handlerName] = async (data) => {
			await store.updateData(
				key as Key,
				handler.request(data),
				true,
				persistStore,
			);
			try {
				const route = routeScope[handlerName];
				const resData = await api.fetch(route, data);
				if (resData?.ok) {
					await store.updateData(
						key as Key,
						handler.success(data, resData),
						true,
						persistStore,
					);
				} else {
					await store.updateData(
						key as Key,
						handler.failure(data),
						true,
						persistStore,
					);
				}
				return resData;
			} catch (err) {
				await store.updateData(
					key as Key,
					handler.failure(data),
					true,
					persistStore,
				);
				return err;
			}
		};
	});

	return res;
};

syncApiObject.update = {
	request: (state) => ({
		data: state.data,
		error: undefined,
		isLoaded: state.isLoaded ?? false,
		isLoading: true,
	}),
	success: (state, result) => state,
	// eslint-disable-next-line sort-keys
	failure: (state) => state,
};
syncApiObject.replace = {
	request: (state) => state,
	success: (state) => state,
	// eslint-disable-next-line sort-keys
	failure: (state) => state,
};
syncApiObject.nothing = {
	request: (state) => state,
	success: (state) => state,
	// eslint-disable-next-line sort-keys
	failure: (state) => state,
};

const auth = syncApiObject<string, {id: string}, AuthRoutes>(
	{} as any,
	{} as any,
	authScope.BASE,
	{},
	authScope,
	{
		login: syncApiObject.update,
		logout: syncApiObject.replace,
	},
);

console.log('разные возможности', {
	authLogin: auth.login(),
	authLogout: auth.logout,
	authSelector: auth.select,
});
