import {SyncObjectType, syncObject} from '@storng/store';

import {API_AUTH, AuthUrls} from './_auth';
import {StoreType} from './store.type';

type Actions = {
	otherHandler: {d: number};
};

export const auth: SyncObjectType<AuthUrls, StoreType['auth_public'], Actions> =
	syncObject<StoreType, 'auth_public', AuthUrls, Actions>(API_AUTH, {
		otherHandler: syncObject.nothing,
		register: syncObject.nothing,
		registerConfirm: syncObject.replace,
	});
