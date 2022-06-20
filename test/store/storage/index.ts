import {GetScope, Route} from '@storng/common';
import {ScopeHandlers, Store, SyncObjectType, syncObj} from '@storng/store';

import {mockSuccessItemFetch} from './mock.fetch';
import {StoreType} from './store.type';

export let store: Store<StoreType>;

export const getStore = (name: string): Store<StoreType> => {
	store = new Store<StoreType>(
		name,
		1,
		{
			auth_public: 'id',
			notify: 'id',
		},
		mockSuccessItemFetch,
	);
	return store;
};

export const syncObject = <
	Key extends keyof StoreType = keyof StoreType,
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	OtherRoutes extends Record<string, any> = Record<string, never>,
>(
	storeName: string,
	scope: GetScope<Routes, Key> | Key,
	scopeHandlers: ScopeHandlers<StoreType, Key, Routes, OtherRoutes>,
	initState?: StoreType[Key],
): SyncObjectType<Routes, StoreType[Key], OtherRoutes> => {
	return syncObj<StoreType, Key, Routes, OtherRoutes>(
		getStore(storeName),
		scope,
		scopeHandlers,
		initState,
		true,
	);
};

syncObject.update = syncObj.update;
syncObject.replace = syncObj.replace;
syncObject.nothing = syncObj.nothing;
syncObject.remove = syncObj.remove;
syncObject.deepMerge = syncObj.deepMerge;
syncObject.custom = syncObj.custom;
