import { API_AUTH, AuthUrls } from './_auth';
import { Store, syncObject } from './index';

export const auth = syncObject<Store['auth'], AuthUrls>('auth', {}, API_AUTH, {
  register: syncObject.nothing,
  registerConfirm: syncObject.replace,
});
