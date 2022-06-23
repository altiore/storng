import {LoadedItem, MaybeRemoteData, PersistStore} from '../types';

const getDataPreparation =
	<T>(data: LoadedItem<T[keyof T]>) =>
	() =>
		data;

export function firstSubscriptionCb<T extends Record<string, T[keyof T]>>(
	key: keyof T,
	restorePreparation: (i: LoadedItem<T[keyof T]>) => LoadedItem<T[keyof T]>,
	getObjFunc: (
		value: LoadedItem<T[keyof T]>,
	) => MaybeRemoteData<LoadedItem<T[keyof T]>>,
	persistStore?: PersistStore<T>,
): (
	i: LoadedItem<T[keyof T]>,
	updateData: (
		key: keyof T,
		getData: (data: LoadedItem<T[keyof T]>) => LoadedItem<T[keyof T]>,
		prepareDataForSubscriber: (value: LoadedItem<T[keyof T]>) => any,
		cb?: (i: LoadedItem<T[keyof T]> | false) => Promise<void>,
	) => void,
) => Promise<void> {
	return async (item: LoadedItem<T[keyof T]>, updateData): Promise<void> => {
		console.log('subscribe cb', {
			initial: item.loadingStatus.initial,
			persistStore: Boolean(persistStore),
		});
		if (item.loadingStatus.initial && persistStore) {
			// 2.1. Восстанавливаем данные
			let data: any;
			const restoredData = await persistStore.getItem(key);
			if (typeof restoredData !== 'undefined') {
				data = restorePreparation(restoredData);
			} else {
				data = restorePreparation(item);
			}

			updateData(key, getDataPreparation(data), getObjFunc);

			await persistStore.setItem(key, data);
		}

		if (item.loadingStatus.initial && !persistStore) {
			updateData(key, restorePreparation, getObjFunc);
		}
	};
}