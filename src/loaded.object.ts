// import { StornMap } from '~/@storn/@types';
// import api from '~/@storn/api/api1';
import {PersistStore, WeakStore} from '~/store';

export const loadedObject = function <T extends Record<string, any>>(
	key: keyof T,
	initData: T[keyof T],
	persistStore: PersistStore<T>,
	_remoteStorage?: unknown,
): {selector: (data: T[keyof T]) => any} {
	const store = WeakStore.getStore<T>();
	return {
		selector: function (subscriber: (value: T[keyof T]) => any) {
			store.subscribe(key, persistStore, subscriber, initData).then().catch();

			return () => store.unsubscribe(key, persistStore, subscriber);
		},
	};
};

// export const {selector: authFun, actions: authAct} = loadedObject(
//   StornMap.Auth,
//   'localStorage',
//   api(routes, {
//     get: record.replace,
//     update: record.update,
//     login: record.update,
//   }),
// );

// export const {} = loadedObject(
//   StornMap.Auth,
//   {},
//   (() => 'persistStore') as any,
//   api({}, {}),
// )
