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
		},
		mockSuccessItemFetch,
	);
	return store;
};

export const syncObject = <
	Routes extends Record<string, Route<any, any>> = any,
>(
	storeName: string,
	routeScope: GetScope<Routes, keyof StoreType>,
	routeScopeHandlers: {
		[P in keyof Routes]: RemoteHandlers<StoreType[keyof StoreType]>;
	},
	initState?: StoreType[keyof StoreType],
): SyncObjectType<Routes> => {
	return syncObj<StoreType, Routes>(
		getStore(storeName),
		routeScope,
		routeScopeHandlers,
		initState,
	);
};

syncObject.update = syncObj.update;
syncObject.replace = syncObj.replace;
syncObject.nothing = syncObj.nothing;
