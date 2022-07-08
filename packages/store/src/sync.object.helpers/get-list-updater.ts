import {GetScope} from '@storng/common';
import {LoadedList, Store} from '@storng/store';

export const getListUpdater =
	<T extends Record<keyof T, T[keyof T]>>(
		scope: GetScope<any, keyof T> | keyof T,
		persistData: boolean,
	) =>
	(store: Store<T>) =>
	(handler: (i: LoadedList<T[keyof T]>) => LoadedList<T[keyof T]>): void => {
		const scopeName: keyof T =
			typeof scope === 'object' ? (scope.NAME as keyof T) : scope;

		const shouldPersistStore =
			typeof persistData === 'boolean'
				? persistData
				: typeof scope === 'object';

		const persistStorage = shouldPersistStore
			? store.local.listStorage()
			: undefined;

		store
			.updateListData(scopeName, handler, persistStorage as any)
			.then()
			.catch(console.error);
	};
