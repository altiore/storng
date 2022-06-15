import {GetScope, Route} from '@storng/common';
import {RemoteHandlers, Store, SyncObjectType, syncObj} from '@storng/store';

import {mockSuccessItemFetch} from './mock.fetch';
import {StoreType} from './store.type';

const STORAGE_NAME = 'PREPARED_NAME';

const store = new Store<StoreType>(
	STORAGE_NAME,
	1,
	{
		auth_public: 'id',
	},
	mockSuccessItemFetch,
);

export const syncObject = <
	Routes extends Record<string, Route<any, any>> = any,
>(
	routeScope: GetScope<Routes, keyof StoreType>,
	routeScopeHandlers: {
		[P in keyof Routes]: RemoteHandlers<StoreType[keyof StoreType]>;
	},
	initState?: StoreType[keyof StoreType],
): SyncObjectType<Routes> => {
	return syncObj<StoreType, Routes>(
		store,
		routeScope,
		routeScopeHandlers,
		initState,
	);
};

syncObject.update = syncObj.update;
syncObject.replace = syncObj.replace;
syncObject.nothing = syncObj.nothing;
