import {Route} from '@storng/common';

import {StoreCache} from './store.cache';
import {StoreLocal} from './store.local';
import {StoreRemote} from './store.remote';
import {defRestorePreparation} from './sync.object.helpers/def.restore.preparation';
import {
	AuthData,
	FetchType,
	KeyNames,
	LoadedItem,
	LoadingStatus,
	PersistStore,
	StoreStructure,
} from './types';

const getDataPreparationByData =
	<T>(data: T) =>
	(s: LoadedItem<T[keyof T]>): LoadedItem<T[keyof T]> => ({
		data,
		loadingStatus: s.loadingStatus,
	});

const GET_CLEAR_OBJ_DATA =
	(initial: LoadedItem<any>['data'] = {}) =>
	(): LoadedItem<any> => ({
		data: initial,
		loadingStatus: {
			error: undefined,
			isLoaded: false,
			isLoading: false,
			updatedAt: new Date().getTime(),
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

	public loadingStatus = new Map<keyof T, LoadingStatus>();

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
		this.loadingStatus = new Map(
			Object.keys(entityKeyNames).map((key) => [
				key,
				{
					declinedRestore: false,
					isLocalLoaded: false,
					isLocalLoading: false,
				},
			]),
		);
		this.remote = new StoreRemote(
			customFetch,
			prefix,
			this.cache.getAuthToken.bind(this.cache),
			this.logout.bind(this),
			this.updateAuthData.bind(this),
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
		await Promise.all(
			Array.from(this.cache.structure.keys()).map(async (key) => {
				if (!this.publicStorages.includes(key)) {
					const struct = this.cache.structure.get(key);
					const isPersist = struct?.isPersist;
					let persistStore: PersistStore<T> | undefined = undefined;
					if (isPersist) {
						persistStore = this.local.itemStorage();
					}
					await this.updateData(
						key,
						GET_CLEAR_OBJ_DATA(struct?.initData.data),
						persistStore,
					);
				}
			}),
		);
	}

	subscribe = <ResultData = LoadedItem<T[keyof T]>>(
		storeName: keyof T,
		subscriber: (value: ResultData) => void,
		dataPreparer: (value: LoadedItem<T[keyof T]>) => ResultData,
		restorePreparation: (v: LoadedItem<T[keyof T]>) => LoadedItem<T[keyof T]>,
		persistStore?: PersistStore<T>,
		initDataData?: Partial<T[keyof T]>,
	): void => {
		const loadingStatus = this.loadingStatus.get(storeName);

		if (loadingStatus?.isLocalLoading) {
			// 1. Если восстановление данных в процессе, отложить подписку элемента на данные
			setTimeout(() => {
				this.subscribe.bind(this)(
					storeName,
					subscriber,
					dataPreparer,
					restorePreparation,
					persistStore,
					initDataData,
				);
			}, 100);
			return;
		}

		// 2. добавляем подписчика
		const item = this.cache.subscribe(
			storeName,
			subscriber,
			dataPreparer,
			initDataData,
			Boolean(persistStore),
		);

		if (!persistStore || loadingStatus?.isLocalLoaded) {
			// 3. Если данные уже восстановлены или мы вообще не храним их в локальном хранилище, --
			//    отправить данные текущему подписчику
			this.updateLoadingStatus(storeName, {
				isLocalLoaded: true,
			});
			subscriber(dataPreparer(item));
			return;
		}

		this.updateLoadingStatus(storeName, {
			isLocalLoading: true,
		});

		this.restoreData(storeName, persistStore, item, restorePreparation)
			.then((data) => {
				this.updateLoadingStatus(storeName, {
					isLocalLoading: false,
				});
				if (!this.loadingStatus.get(storeName)?.declinedRestore) {
					this.cache.updateData(storeName, data, false);
					subscriber(dataPreparer(data));
				}
			})
			.catch((err) => {
				console.error(err);
				this.updateLoadingStatus(storeName, {
					isLocalLoaded: false,
				});
			});
	};

	unsubscribe = (key: keyof T, subscriber: (value: any) => void): void => {
		const isOtherSubscribersExists = this.cache.unsubscribe(key, subscriber);

		if (!isOtherSubscribersExists) {
			this.updateLoadingStatus(key, {
				isLocalLoaded: false,
			});
		}
	};

	updateData = async (
		key: keyof T,
		getData: (data: LoadedItem<T[keyof T]>) => LoadedItem<T[keyof T]>,
		persistStore?: PersistStore<T>,
	): Promise<void> => {
		this.updateLoadingStatus(key, {
			declinedRestore: true,
		});
		const loadingStatus = this.loadingStatus.get(key);

		if (loadingStatus?.isLocalLoading || !loadingStatus?.isLocalLoaded) {
			// 1. Если восстановление данных в процессе, отложить обновление данных
			setTimeout(() => {
				this.updateData.bind(this)(key, getData, persistStore);
			}, 200);
			return;
		}

		if (persistStore) {
			this.updateLoadingStatus(key, {
				isLocalLoading: true,
			});

			const existingData = this.cache.getData(key);
			if (existingData) {
				const newData1 = getData(existingData.data);
				if (
					existingData.data.loadingStatus.isLoading !== true ||
					newData1.loadingStatus.isLoading !== true
				) {
					await persistStore.setItem(key, newData1);
					this.cache.updateData(key, newData1);
				}
			} else {
				const prevData = await persistStore.getItem(key);

				const newData = getData(prevData);
				await persistStore.setItem(key, newData);
			}
		} else {
			this.cache.updateData(key, getData);
		}

		this.updateLoadingStatus(key, {
			declinedRestore: false,
			isLocalLoading: false,
		});
	};

	restoreData = async (
		key: keyof T,
		persistStore: PersistStore<T>,
		prevData: LoadedItem<T[keyof T]>,
		restorePreparation: (
			v: LoadedItem<T[keyof T]>,
		) => LoadedItem<T[keyof T]> = defRestorePreparation,
	): Promise<LoadedItem<T[keyof T]>> => {
		const loadingStatus = this.loadingStatus.get(key);

		if (loadingStatus?.isLocalLoaded) {
			return prevData;
		}

		// 5. Получить данные из хранилища
		const restoredData = await persistStore.getItem(key);

		let data;
		if (typeof restoredData === 'undefined') {
			// 6. Если нет восстановленных данных -- использовать данные по-умолчанию
			data = restorePreparation(prevData);
		} else {
			// 7. Если есть восстановленные данные - использовать их для восстановления
			data = restorePreparation(restoredData);
		}

		await persistStore.setItem(key, data);

		this.updateLoadingStatus(key, {
			isLocalLoaded: true,
		});

		return data;
	};

	updateAuthData = async (authData: AuthData): Promise<void> => {
		if (this.authStorage) {
			await this.updateData(
				this.authStorage,
				getDataPreparationByData<any>(authData),
				this.local.itemStorage(),
			);
		}
	};

	private updateLoadingStatus = (
		key,
		newLoadingStatus: Partial<LoadingStatus>,
	) => {
		const loadingStatus = this.loadingStatus.get(key);
		this.loadingStatus.set(key, {
			...loadingStatus,
			...newLoadingStatus,
		} as any);
	};
}
