import {GetScope, Route} from '@storng/common';
import {ScopeHandlers, Store, SyncObjectType} from '@storng/store';
import {syncObject as getSyncObj} from '@storng/store/src/sync.object';

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
	scope: GetScope<Routes, Key> | Key,
	scopeHandlers: ScopeHandlers<StoreType, Key, Routes, OtherRoutes>,
	initState?: StoreType[Key],
): SyncObjectType<Routes, StoreType[Key], OtherRoutes> => {
	return getSyncObj<StoreType, Key, Routes, OtherRoutes>(
		scope,
		scopeHandlers,
		initState,
		true,
	);
};

syncObject.update = getSyncObj.update;
syncObject.replace = getSyncObj.replace;
syncObject.nothing = getSyncObj.nothing;
syncObject.remove = getSyncObj.remove;
syncObject.deepMerge = getSyncObj.deepMerge;
syncObject.custom = getSyncObj.custom;
