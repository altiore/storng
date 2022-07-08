import {syncList} from '@storng/store';

import {API_USERS, UsersUrls} from './_users';
import {StoreType} from './store.type';

type Actions = {
	otherHandler: {d: number};
};

export const users = syncList<StoreType, 'users', UsersUrls, Actions>(
	API_USERS,
	{
		fetch: syncList.replace,
		otherHandler: syncList.nothing,
	},
);
