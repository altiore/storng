import {DataRes, ErrorOrInfo, GetScope, Route} from '@storng/common';

import {createSelector} from './react/create-selector';
import {getObjFunc} from './react/get.func-data';
import {Store} from './store';
import {getUpdater} from './sync.object.helpers/get-updater';
import {prepareActions} from './sync.object.helpers/prepare-actions';
import {
	ActionHandlers,
	LoadedItem,
	ScopeHandlers,
	StructureType,
	SyncObjectType,
} from './types';
import {deepAssign} from './utils';

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

	result.item = createSelector(
		getObjFunc,
		[
			{
				pointer: ['1', scopeName as string, scopeName as string],
				type: StructureType.ITEM,
			},
		],
		initData,
	);

	return result;
}

const requestHandler = <T extends Record<string, any> = Record<string, any>>(
	s: LoadedItem<T>,
): LoadedItem<T> => ({
	data: s.data,
	loadingStatus: {
		...s.loadingStatus,
		isLoading: true,
	},
});

const failureHandler = <T extends Record<string, any> = Record<string, any>>(
	s: LoadedItem<T>,
	_,
	remote: {res: ErrorOrInfo; route: Route},
): LoadedItem<T> => ({
	data: s.data,
	loadingStatus: {
		...s.loadingStatus,
		error: remote.res,
		isLoading: false,
	},
});

syncObject.nothing = {
	request: requestHandler,
	success: (s): LoadedItem<any> => {
		return {
			data: s.data,
			loadingStatus: {
				...s.loadingStatus,
				error: undefined,
				isLoading: false,
				updatedAt: new Date().getTime(),
			},
		};
	},
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as ActionHandlers;

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
} as ActionHandlers;

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
} as ActionHandlers;

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
} as ActionHandlers;

syncObject.deepMerge = {
	request: requestHandler,
	success: (
		s,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedItem<any> => ({
		data: deepAssign(s.data, remote?.res?.data || data || {}),
		loadingStatus: {
			error: undefined,
			isLoaded: true,
			isLoading: false,
			updatedAt: new Date().getTime(),
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as ActionHandlers;

syncObject.custom = <T, D = any>(
	cb: (a: T, data: D) => T,
): ActionHandlers<T, D> => ({
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
} as ActionHandlers;
