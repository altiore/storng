import {syncObject} from '@storng/store';

import {API_AUTH, AuthUrls} from './_auth';
import {StoreType} from './store.type';

type Actions = {
	otherHandler: {d: number};
};

export const auth = syncObject<StoreType, 'auth_public', AuthUrls, Actions>(
	API_AUTH,
	{
		otherHandler: syncObject.nothing,
		register: syncObject.nothing,
		registerConfirm: syncObject.replace,
	},
);
