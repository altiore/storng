import {DataRes, ErrorOrInfo, GetScope, Route} from '@storng/common';

import {getObjFunc} from './react/get.func-data';
import {Store} from './store';
import {getUpdater} from './sync.object.helpers/get-updater';
import {prepareActions} from './sync.object.helpers/prepare-actions';
import {
	LoadedItem,
	LoadedList,
	ScopeHandlers,
	StructureType,
	SyncObjectType,
} from './types';
import {deepAssign, getInitData} from './utils';

export function syncObject<
	StoreState extends Record<string, StoreState[keyof StoreState]>,
	Key extends keyof StoreState = keyof StoreState,
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	OtherRoutes extends Record<string, any> = Record<string, never>,
>(
	scope: GetScope<Routes, Key> | Key,
	scopeHandlers: ScopeHandlers<StoreState, Key, Routes, OtherRoutes>,
	initData?: StoreState[Key],
	persistData?: boolean,
): SyncObjectType<Routes, OtherRoutes> {
	const result: any = {};
	result.type = StructureType.ITEM;

	prepareActions<StoreState, Key, Routes, OtherRoutes>(
		result,
		scope,
		scopeHandlers,
		getUpdater<StoreState>(scope, persistData as any) as any,
		initData,
	);

	const scopeName: keyof StoreState =
		typeof scope === 'object' ? (scope.NAME as keyof StoreState) : scope;

	result.item = {
		defaultValue: initData
			? getObjFunc(getInitData(true, initData))
			: getObjFunc(),
		dependencies: [scopeName],
		subscribe: (store: Store<any>) => (subscriber) => {
			store.subscribeItem(
				scopeName,
				subscriber,
				undefined,
				store.local.itemStorage(),
				initData,
			);
			return () => store.unsubscribe(scopeName, subscriber);
		},
		transform: getObjFunc,
	};

	return result;
}

const requestHandler = <T extends Record<string, any> = Record<string, any>>(
	s: LoadedItem<T>,
	data?: any,
): LoadedItem<T> => ({
	data: s.data ?? data ?? ({} as any),
	loadingStatus: {
		...s.loadingStatus,
		isLoading: true,
	},
});

const failureHandler = <T extends Record<string, any> = Record<string, any>>(
	s: LoadedItem<T>,
	data,
	remote: {res: ErrorOrInfo; route: Route},
): LoadedItem<T> => ({
	data: s.data ?? data ?? ({} as any),
	loadingStatus: {
		...s.loadingStatus,
		error: remote.res,
		isLoading: false,
	},
});

syncObject.nothing = {
	request: (s) => s,
	success: (s) => s,
	// eslint-disable-next-line sort-keys
	failure: (s) => s,
} as any;

syncObject.update = {
	request: requestHandler,
	success: (
		s,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedItem<any> => ({
		data: {
			...s.data,
			...(remote?.res?.data || data || {}),
		},
		loadingStatus: {
			error: undefined,
			isLoaded: true,
			isLoading: false,
			updatedAt: new Date().getTime(),
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;

syncObject.replace = {
	request: requestHandler,
	success: (
		s,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedItem<any> => ({
		data: remote?.res?.data || data || {},
		loadingStatus: {
			error: undefined,
			isLoaded: true,
			isLoading: false,
			updatedAt: new Date().getTime(),
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;

syncObject.remove = {
	request: requestHandler,
	success: (s, data): LoadedItem<any> => ({
		data: data || {},
		loadingStatus: {
			error: undefined,
			isLoaded: false,
			isLoading: false,
			updatedAt: new Date().getTime(),
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;

syncObject.deepMerge = {
	request: requestHandler,
	success: (
		s,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedItem<any> => ({
		data: deepAssign(s.data ?? {}, remote?.res?.data || data || {}),
		loadingStatus: {
			error: undefined,
			isLoaded: true,
			isLoading: false,
			updatedAt: new Date().getTime(),
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;

syncObject.custom = <T, D = any>(cb: (a: T, data: D) => T): any => ({
	request: requestHandler,
	success: (s: LoadedItem<T>, data: D): LoadedItem<T> => {
		return {
			data: cb(s.data as any, data),
			loadingStatus: {
				error: undefined,
				isLoaded: true,
				isLoading: false,
				updatedAt: new Date().getTime(),
			},
		};
	},
	// eslint-disable-next-line sort-keys
	failure: failureHandler as any,
});

syncObject.logout = {
	request: requestHandler,
	success: (s, data, add: {store: Store<any>}): LoadedItem<any> => {
		if (add?.store?.logout) {
			add.store.logout();
		} else {
			console.error('Вы пытаетесь выйти, но метод выхода не определен');
		}
		return s;
	},
	// eslint-disable-next-line sort-keys
	failure: (s, data, add: {store: Store<any>}): LoadedItem<any> => {
		if (add?.store?.logout) {
			add.store.logout();
		} else {
			console.error('Вы пытаетесь выйти, но метод выхода не определен');
		}
		return s;
	},
} as any;

syncObject.file = {
	request: requestHandler,
	success: (s: LoadedList<any>): LoadedList<any> => {
		return s;
	},
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;

syncObject.fileHidden = {
	request: (s) => s,
	success: (s: LoadedList<any>): LoadedList<any> => {
		return s;
	},
	// eslint-disable-next-line sort-keys
	failure: (s) => s,
} as any;
