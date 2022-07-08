import {GetScope} from '@storng/common';
import {LoadedItem, Store} from '@storng/store';

export const getUpdater =
	<T extends Record<keyof T, T[keyof T]>>(
		scope: GetScope<any, keyof T> | keyof T,
		persistData: boolean,
	) =>
	(store: Store<T>) =>
	(handler: (i: LoadedItem<T[keyof T]>) => LoadedItem<T[keyof T]>): void => {
		const scopeName: keyof T =
			typeof scope === 'object' ? (scope.NAME as keyof T) : scope;

		const shouldPersistStore =
			typeof persistData === 'boolean'
				? persistData
				: typeof scope === 'object';

		const persistStorage = shouldPersistStore
			? store.local.itemStorage()
			: undefined;

		store
			.updateData(scopeName, handler, persistStorage as any)
			.then()
			.catch(console.error);
	};
