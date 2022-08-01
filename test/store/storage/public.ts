import {Method, ResBase, Route, RouteScope} from '@storng/common';
import {MaybeRemoteData, syncObject} from '@storng/store';
import {createSelector} from '@storng/store/react';

import {StoreType} from './store.type';

export type PublicUrls = {
	fetchVersion: Route<
		Record<string, never>,
		ResBase<StoreType['public_common']>
	>;
};

export const API_PUBLIC = RouteScope<PublicUrls, 'public_common'>({
	BASE: '/public',
	NAME: 'public_common',
	URL: {
		fetchVersion: {method: Method.GET, path: '/version'},
	},
});

export const publicData = syncObject<StoreType, 'public_common', PublicUrls>(
	API_PUBLIC,
	{
		fetchVersion: syncObject.replace,
	},
	{
		api: {api: 'default', contracts: 'default'},
	},
	true,
);

export const apiVersion = createSelector(
	(funData: MaybeRemoteData<StoreType['public_common']>): string => {
		return funData<string>({
			correct: ({data}) => data.api.api,
			failure: 'X.X.X',
			loading: 'X.X.X',
			nothing: 'X.X.X',
		});
	},
	[publicData.item],
	'X.X.X',
);
