import {GetScope, Route} from '@storng/common';
import {RemoteHandlers, Store, SyncObjectType, syncObj} from '@storng/store';

import {mockSuccessItemFetch} from './mock.fetch';
import {StoreType} from './store.type';

export let store: Store<StoreType>;

const getStore = (name) => {
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
	Key extends keyof StoreType,
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	OtherRoutes extends string = never,
>(
	storeName: string,
	routeScope: GetScope<Routes, Key> | Key,
	routeScopeHandlers: {
		[P in keyof Routes]: RemoteHandlers<
			StoreType[Key],
			Routes[P] extends Route<infer Req> ? Req : never
		>;
	} &
		{[P in OtherRoutes]: RemoteHandlers<StoreType[Key]>},
	initState?: StoreType[Key],
): SyncObjectType<Routes, StoreType[Key], OtherRoutes> => {
	return syncObj<StoreType, Key, Routes, OtherRoutes>(
		getStore(storeName),
		routeScope,
		routeScopeHandlers,
		initState,
	);
};

syncObject.update = syncObj.update;
syncObject.replace = syncObj.replace;
syncObject.nothing = syncObj.nothing;
syncObject.remove = syncObj.remove;
syncObject.deepMerge = syncObj.deepMerge;
