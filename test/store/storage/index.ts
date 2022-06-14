import { GetScope, RequestFunc, Route } from '@storng/common';
import {RemoteHandlers, StoreApi, WeakStore, getPersistStore, syncObject as syncObj} from '@storng/store';

export type Store = {
  auth: {accessToken: string};
}

const STORAGE_NAME = 'storng';

const localStorage = WeakStore.getStore<Store>(STORAGE_NAME);

const successFetchJson = chai.spy(() => new Promise((resolve) => {
  resolve({
    data: {id: 'my-id'},
    ok: true,
  })
}));
export const localFetch = chai.spy(() => new Promise((resolve) => {
  resolve({
    json: successFetchJson,
  });
}));

const apiStore = new StoreApi<any>(localFetch as any);

const persistStorage = getPersistStore(STORAGE_NAME);

export const syncObject = <Data extends Record<string, any>, Routes extends Record<string, Route<any, any>>>(key: keyof Store, initData: Partial<Data>, routeScope: GetScope<Routes>, handlers: { [P in keyof Routes]: RemoteHandlers<Data>}): { [P in keyof Routes]: RequestFunc<Routes[P]>; } & {select: (subscriber: (state: Data) => any) => Promise<() => Promise<void>>} => syncObj<keyof Store, Data, Routes>(localStorage, apiStore, key, initData, routeScope, handlers, persistStorage);

syncObject.update = syncObj.update;
syncObject.replace = syncObj.replace;
syncObject.nothing = syncObj.nothing;
