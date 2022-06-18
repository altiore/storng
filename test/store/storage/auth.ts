import {SyncObjectType} from '@storng/store';

import {API_AUTH, AuthUrls} from './_auth';
import {syncObject} from './index';
import {StoreType} from './store.type';

export const auth = (
	name: string,
): SyncObjectType<AuthUrls, StoreType['auth_public'], 'otherHandler'> =>
	syncObject<'auth_public', AuthUrls, 'otherHandler'>(name, API_AUTH, {
		otherHandler: syncObject.nothing,
		register: syncObject.nothing,
		registerConfirm: syncObject.replace,
	});
