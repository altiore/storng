import {
	DataRes,
	ErrorRes,
	GetScope,
	InfoRes,
	RequestFunc,
	ResBase,
	Route,
} from '@storng/common';
import {PersistStore, WeakStore} from '@storng/store';

import {StoreApi} from './store.api';

type AsyncData<Data> = {
	data: Partial<Data>;
	error?: any;
	isLoading: boolean;
	isLoaded: boolean;
};

export type RemoteHandlers<Data extends any = any> = {
	request: (
		state: Partial<AsyncData<Data>>,
		data: any,
		route: Route,
	) => Partial<AsyncData<Data>>;
	success: (
		state: Partial<AsyncData<Data>>,
		data: any,
		res: ResBase,
	) => Partial<AsyncData<Data>>;
	failure: (
		state: Partial<AsyncData<Data>>,
		data: any,
		res: ResBase,
	) => Partial<AsyncData<Data>>;
};

export const syncObject = <
	Key extends string,
	Data extends Record<string, any>,
	Routes extends Record<string, Route<any, any>> = any,
>(
	store: WeakStore<any>,
	api: StoreApi<any>,
	key: string,
	initData: Partial<Data>,
	routeScope: GetScope<Routes>,
	handlers: {[P in keyof Routes]: RemoteHandlers<Data>},
	persistStore?: PersistStore<any>,
): {[P in keyof Routes]: RequestFunc<Routes[P]>} & {
	select: (subscriber: (state: Data) => any) => Promise<() => Promise<void>>;
} => {
	const res: {[P in keyof Routes]: RequestFunc<Routes[P]>} & {
		select: (subscriber: (state: Data) => any) => Promise<() => Promise<void>>;
	} = {
		select: async function (subscriber: (state: AsyncData<Data>) => any) {
			try {
				await store.subscribe(
					key as Key,
					subscriber,
					{
						data: initData,
						isLoaded: false,
						isLoading: false,
					},
					persistStore,
				);
			} catch (err) {
				console.error(err);
			}

			return () => store.unsubscribe(key as Key, subscriber, persistStore);
		},
	} as any;

	Object.entries(handlers).forEach(([handlerName, handler]) => {
		const route = routeScope[handlerName];
		(res as any)[handlerName] = async (data) => {
			await store.updateData(
				key as Key,
				(state) => handler.request(state, data, route),
				persistStore,
			);
			try {
				const resData = await api.fetch(route, data);
				if (resData?.ok) {
					await store.updateData(
						key as Key,
						(state) => handler.success(state, data, resData),
						persistStore,
					);
				} else {
					await store.updateData(
						key as Key,
						(state) => handler.failure(state, data, resData),
						persistStore,
					);
				}
				return resData;
			} catch (err) {
				await store.updateData(
					key as Key,
					(state) =>
						handler.failure(
							state,
							data,
							err?.ok === false ? err : {error: err, ok: false},
						),
					persistStore,
				);
				return err;
			}
		};
	});

	return res;
};

syncObject.update = {
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

syncObject.replace = {
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

syncObject.nothing = {
	request: (s) => {
		return {
			...s,
			isLoading: true,
		};
	},
	success: (s) => ({
		...s,
		error: undefined,
		isLoading: false,
	}),
	// eslint-disable-next-line sort-keys
	failure: (s, _, res: ErrorRes | InfoRes) => ({
		...s,
		error: (res as InfoRes)?.message ?? (res as ErrorRes).errors,
		isLoading: false,
	}),
} as RemoteHandlers;
