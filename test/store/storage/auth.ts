import {API_AUTH, AuthUrls} from './_auth';
import {syncObject} from './index';

export const auth = syncObject<AuthUrls>(API_AUTH, {
	register: syncObject.nothing,
	registerConfirm: syncObject.replace,
});
