import {GetScope} from '@storng/common';
import {LoadedData, Store} from '@storng/store';

export const getUpdater =
	<T extends Record<keyof T, T[keyof T]>>(
		scope: GetScope<any, keyof T> | keyof T,
		persistData: boolean,
	) =>
	(store: Store<T>) =>
	(
		handler: (i: LoadedData<T[keyof T]>) => LoadedData<T[keyof T]>,
	): Promise<void> => {
		const scopeName: keyof T =
			typeof scope === 'object' ? (scope.NAME as keyof T) : scope;

		const shouldPersistStore =
			typeof persistData === 'boolean'
				? persistData
				: typeof scope === 'object';

		console.log('getUpdater', store);
		const persistStorage = shouldPersistStore
			? store.local.itemStorage()
			: undefined;

		return store.updateData(scopeName, handler, persistStorage as any);
	};
