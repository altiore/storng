import {SyncObjectType} from '@storng/store';

import {API_AUTH, AuthUrls} from './_auth';
import {syncObject} from './index';

export const auth = (name: string): SyncObjectType<AuthUrls> =>
	syncObject<AuthUrls>(name, API_AUTH, {
		register: syncObject.nothing,
		registerConfirm: syncObject.replace,
	});