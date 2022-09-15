import {CrudUrl} from '@storng/common';
import {syncList} from '@storng/store';

import {API_USERS, UsersUrls} from './_users';
import {StoreType} from './store.type';

type Actions = {
	otherHandler: {d: number};
};

export const users = syncList<StoreType, 'users', UsersUrls, Actions>(
	API_USERS,
	{
		[CrudUrl.getMany]: syncList.replace,
		[CrudUrl.getOne]: syncList.updateOne,
		otherHandler: syncList.nothing,
	},
	{
		filterBy: {
			order: {
				order: 'DESC',
				orderBy: 'order',
			},
		},
	},
);
