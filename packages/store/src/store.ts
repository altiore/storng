import {Route} from '@storng/common';

import {StoreCache} from './store.cache';
import {StoreLocal} from './store.local';
import {StoreRemote} from './store.remote';
import {
	FetchType,
	KeyNames,
	LoadedItem,
	PersistStore,
	StoreStructure,
} from './types';

const SET_INITIAL_TO_FALSE = (s: LoadedItem<any>): LoadedItem<any> => ({
	...s,
	loadingStatus: {...s.loadingStatus, initial: false},
});

const SET_IS_LOADING_TO_FALSE = (s: LoadedItem<any>): LoadedItem<any> => ({
	data: s.data,
	loadingStatus: {...s.loadingStatus, initial: false, isLoading: false},
});

const getDataPreparation =
	<T>(data: LoadedItem<T[keyof T]>) =>
	() =>
		data;

const GET_CLEAR_OBJ_DATA =
	(initial: LoadedItem<any>['data'] = {}) =>
	(): LoadedItem<any> => ({
		data: initial,
		loadingStatus: {
			error: undefined,
			initial: false,
			isLoaded: false,
			isLoading: false,
		},
	});

export class Store<T extends Record<string, T[keyof T]>> {
	public cache: StoreCache<T>;
	public local: StoreLocal<StoreStructure<T>>;
	public remote: StoreRemote;
	// в миллисекундах
	public autoRemoveErrorIn = 7000;
	// публичные хранилища, которые не нужно очищать, когда пользователь выходит из приложения
	public publicStorages: Array<keyof T> = [];

	public authStorage?: keyof T;
	public name: string;

	constructor(
		name: string,
		version: number,
		entityKeyNames: KeyNames<StoreStructure<T>>,
		customFetch: FetchType,
		prefix = '',
		authStorage?: keyof T,
		autoRemoveErrorIn?: number,
		updateTokenRoute?: Route,
		publicStorages: Array<keyof T> = [],
	) {
		this.cache = new StoreCache<T>(name, authStorage);
		this.name = name;
		this.local = new StoreLocal<StoreStructure<T>>(
			name,
			version,
			entityKeyNames,
		);
		this.remote = new StoreRemote(
			customFetch,
			prefix,
			this.cache.getAuthToken.bind(this.cache),
			this.logout.bind(this),
			updateTokenRoute,
		);
		this.authStorage = authStorage;
		this.autoRemoveErrorIn = autoRemoveErrorIn ?? this.autoRemoveErrorIn;
		this.publicStorages = publicStorages;
	}

	async remove(): Promise<void> {
		await this.local.deleteStorage();
		// TODO: возможно, нужно так же удалить данные из кэша
	}

	async logout(): Promise<void> {
		console.log('logout', {
			structLength: this.cache.structure.keys(),
		});
		await Promise.all(
			Array.from(this.cache.structure.keys()).map(async (key) => {
				if (!this.publicStorages.includes(key)) {
					const struct = this.cache.structure.get(key);
					const isPersist = struct?.isPersist;
					let persistStore: PersistStore<T> | undefined = undefined;
					if (isPersist) {
						persistStore = this.local.simpleStorage();
					}
					await this.updateData(
						key,
						GET_CLEAR_OBJ_DATA(struct?.initData),
						persistStore,
					);
				}
			}),
		);
	}

	subscribe = <ResultData = LoadedItem<T[keyof T]>>(
		key: keyof T,
		subscriber: (value: ResultData) => void,
		dataPreparer: (value: LoadedItem<T[keyof T]>) => ResultData,
		restorePreparation: (v: LoadedItem<T[keyof T]>) => LoadedItem<T[keyof T]>,
		persistStore?: PersistStore<T>,
		initDataData?: Partial<T[keyof T]>,
	): void => {
		const item = this.cache.subscribe(
			key,
			subscriber,
			dataPreparer,
			initDataData,
			Boolean(persistStore),
		);

		if (item.loadingStatus.initial) {
			if (persistStore) {
				this.cache.updateData(key, SET_INITIAL_TO_FALSE);
				// 2.1. Восстанавливаем данные
				persistStore
					.getItem(key)
					.then((restoredData) => {
						let data;
						if (typeof restoredData !== 'undefined') {
							data = restorePreparation(restoredData);
						} else {
							data = restorePreparation(item);
						}

						persistStore
							.setItem(key, data)
							.then(() => {
								this.updateData(key, getDataPreparation(data), persistStore)
									.then()
									.catch(console.error);
							})
							.catch(console.error);
					})
					.catch(console.error);
			} else {
				this.updateData(key, SET_IS_LOADING_TO_FALSE, persistStore)
					.then()
					.catch(console.error);
			}
		} else {
			subscriber(dataPreparer(item));
		}
	};

	updateData = async (
		key: keyof T,
		getData: (data: LoadedItem<T[keyof T]>) => LoadedItem<T[keyof T]>,
		persistStore?: PersistStore<T>,
	): Promise<void> => {
		if (persistStore) {
			const existingData = this.cache.getData(key);
			if (existingData) {
				await persistStore.setItem(key, getData(existingData.data));
				this.cache.updateData(key, getData);
			} else {
				const prevData = await persistStore.getItem(key);

				const newData = getData(prevData);
				await persistStore.setItem(key, newData);
				this.cache.updateData(key, getDataPreparation(newData));
			}
		} else {
			this.cache.updateData(key, getData);
		}
	};
}
