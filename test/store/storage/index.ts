import {GetScope, Route} from '@storng/common';
import {RemoteHandlers, Store, SyncObjectType, syncObj} from '@storng/store';

import {mockSuccessItemFetch} from './mock.fetch';

export type StoreState = {
	auth: {accessToken: string};
};

const STORAGE_NAME = 'PREPARED_NAME';

const store = new Store<StoreState>(
	STORAGE_NAME,
	1,
	{
		auth: 'id',
	},
	mockSuccessItemFetch,
);

export const syncObject = <
	Routes extends Record<string, Route<any, any>> = any,
>(
	routeScope: GetScope<Routes>,
	routeScopeHandlers: {
		[P in keyof Routes]: RemoteHandlers<StoreState[keyof StoreState]>;
	},
	initState?: StoreState[keyof StoreState],
): SyncObjectType<Routes> => {
	return syncObj<StoreState, Routes>(
		store,
		routeScope,
		routeScopeHandlers,
		initState,
	);
};

syncObject.update = syncObj.update;
syncObject.replace = syncObj.replace;
syncObject.nothing = syncObj.nothing;
