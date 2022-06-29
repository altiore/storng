import {Method, ResBase, Route, RouteScope} from '@storng/common';
import {syncObject} from '@storng/store';

import {StoreType} from './store.type';

export type PublicUrls = {
	version: Route<Record<string, never>, ResBase<StoreType['public_common']>>;
};

export const API_PUBLIC = RouteScope<PublicUrls, 'public_common'>({
	BASE: '/public',
	NAME: 'public_common',
	URL: {
		version: {method: Method.GET, path: '/version'},
	},
});

export const publicData = syncObject<StoreType, 'public_common', PublicUrls>(
	API_PUBLIC,
	{
		version: syncObject.replace,
	},
	{
		api: {api: 'default', contracts: 'default'},
	},
	true,
);
