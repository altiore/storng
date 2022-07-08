import {Route} from '@storng/common';

import {StoreCache} from './store.cache';
import {StoreLocal} from './store.local';
import {StoreRemote} from './store.remote';
import {defRestorePreparation} from './sync.object.helpers/def.restore.preparation';
import {
	AuthData,
	FetchType,
	KeyNames,
	ListPersistStore,
	LoadedData,
	LoadedItem,
	LoadedList,
	LoadingStatus,
	PersistStore,
	StoreStructure,
	StructureType,
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

const GET_CLEAR_LIST_DATA =
	(initial: LoadedList<any>['data'] = []) =>
	(): LoadedList<any> => ({
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
					if (!struct) {
						console.error(`structure с ключом "${key}" не была найдена`);
						return Promise.resolve();
					}
					const isPersist = struct?.isPersist;
					if (struct.type === StructureType.ITEM) {
						let persistStore: PersistStore<T> | undefined = undefined;
						if (isPersist) {
							persistStore = this.local.itemStorage();
						}
						await this.updateData(
							key,
							GET_CLEAR_OBJ_DATA(struct?.initData.data),
							persistStore,
						);
					} else if (struct.type === StructureType.LIST) {
						let persistListStore: ListPersistStore<T> | undefined = undefined;
						if (isPersist) {
							persistListStore = this.local.listStorage();
						}
						await this.updateListData(
							key,
							GET_CLEAR_LIST_DATA(),
							persistListStore,
						);
					}
				}
			}),
		);
	}

	subscribe = <ResultData = LoadedItem<T[keyof T]>>(
		key: keyof T,
		subscriber: (value: ResultData) => void,
		dataPreparer: (value: LoadedData<T[keyof T]>) => ResultData,
		restorePreparation: (v: LoadedItem<T[keyof T]>) => LoadedItem<T[keyof T]>,
		persistStore?: PersistStore<T>,
		initDataData?: Partial<T[keyof T]>,
	): void => {
		const loadingStatus = this.loadingStatus.get(key);

		if (loadingStatus?.isLocalLoading) {
			// 1. Если восстановление данных в процессе, отложить подписку элемента на данные
			setTimeout(() => {
				this.subscribe.bind(this)(
					key,
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
			key,
			subscriber,
			dataPreparer,
			initDataData,
			Boolean(persistStore),
		);

		if (!persistStore || loadingStatus?.isLocalLoaded) {
			// 3. Если данные уже восстановлены или мы вообще не храним их в локальном хранилище, --
			//    отправить данные текущему подписчику
			this.updateLoadingStatus(key, {
				isLocalLoaded: true,
			});
			subscriber(dataPreparer(item));
			return;
		}

		this.updateLoadingStatus(key, {
			isLocalLoading: true,
		});

		this.restoreData(key, persistStore, item, restorePreparation as any)
			.then((data) => {
				this.updateLoadingStatus(key, {
					isLocalLoading: false,
				});
				if (!this.loadingStatus.get(key)?.declinedRestore) {
					this.cache.updateData(key, data, false);
					subscriber(dataPreparer(data as LoadedItem<T[keyof T]>));
				}
			})
			.catch((err) => {
				console.error(err);
				this.updateLoadingStatus(key, {
					isLocalLoaded: false,
				});
			});
	};

	subscribeList = <ResultData = LoadedList<T[keyof T]>>(
		storeName: keyof T,
		subscriber: (value: ResultData) => void,
		dataPreparer: (value: LoadedList<T[keyof T]>) => ResultData,
		restorePreparation: (v: LoadedList<T[keyof T]>) => LoadedList<T[keyof T]>,
		persistStore?: ListPersistStore<T>,
	): void => {
		const loadingStatus = this.loadingStatus.get(storeName);

		if (loadingStatus?.isLocalLoading) {
			// 1. Если восстановление данных в процессе, отложить подписку элемента на данные
			setTimeout(() => {
				this.subscribeList.bind(this)(
					storeName,
					subscriber,
					dataPreparer,
					restorePreparation,
					persistStore,
				);
			}, 100);
			return;
		}

		// 2. добавляем подписчика
		const item = this.cache.subscribeList(
			storeName,
			subscriber,
			dataPreparer as any,
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

		this.restoreListData(
			storeName,
			persistStore,
			item,
			restorePreparation as any,
		)
			.then((data) => {
				this.updateLoadingStatus(storeName, {
					isLocalLoading: false,
				});
				if (!this.loadingStatus.get(storeName)?.declinedRestore) {
					this.cache.updateData(storeName, data, false);
					subscriber(dataPreparer(data as LoadedList<T[keyof T]>));
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
		getData: (data: LoadedData<T[keyof T]>) => LoadedData<T[keyof T]>,
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

	updateListData = async (
		storeName: keyof T,
		getData: (data: LoadedList<T[keyof T]>) => LoadedList<T[keyof T]>,
		persistStore?: ListPersistStore<T>,
	): Promise<void> => {
		this.updateLoadingStatus(storeName, {
			declinedRestore: true,
		});
		const loadingStatus = this.loadingStatus.get(storeName);

		if (loadingStatus?.isLocalLoading || !loadingStatus?.isLocalLoaded) {
			// 1. Если восстановление данных в процессе, отложить обновление данных
			setTimeout(() => {
				this.updateListData.bind(this)(storeName, getData, persistStore);
			}, 200);
			return;
		}

		if (persistStore) {
			this.updateLoadingStatus(storeName, {
				isLocalLoading: true,
			});

			const existingData = this.cache.getData(storeName);
			if (existingData) {
				const newData1 = getData(existingData.data as any);
				if (
					existingData.data.loadingStatus.isLoading !== true ||
					newData1.loadingStatus.isLoading !== true
				) {
					await persistStore.setList(storeName, newData1 as any);
					this.cache.updateData(storeName, newData1);
				}
			} else {
				const prevData = await persistStore.getList(storeName);

				const newData = getData(prevData as any) as any;
				await persistStore.setItem(storeName, newData);
			}
		} else {
			this.cache.updateData(storeName, getData as any);
		}

		this.updateLoadingStatus(storeName, {
			declinedRestore: false,
			isLocalLoading: false,
		});
	};

	restoreData = async (
		storeName: keyof T,
		persistStore: PersistStore<T>,
		prevData: LoadedItem<T[keyof T]>,
		restorePreparation: (
			v: LoadedItem<T[keyof T]>,
		) => LoadedItem<T[keyof T]> = defRestorePreparation as any,
	): Promise<LoadedItem<T[keyof T]>> => {
		const loadingStatus = this.loadingStatus.get(storeName);

		if (loadingStatus?.isLocalLoaded) {
			return prevData;
		}

		// 5. Получить данные из хранилища
		const restoredData = await persistStore.getItem(storeName);

		let data;
		if (typeof restoredData === 'undefined') {
			// 6. Если нет восстановленных данных -- использовать данные по-умолчанию
			data = restorePreparation(prevData);
		} else {
			// 7. Если есть восстановленные данные - использовать их для восстановления
			data = restorePreparation(restoredData);
		}

		await persistStore.setItem(storeName, data);

		this.updateLoadingStatus(storeName, {
			isLocalLoaded: true,
		});

		return data;
	};

	restoreListData = async (
		storeName: keyof T,
		persistStore: ListPersistStore<T>,
		prevData: LoadedList<T[keyof T]>,
		restorePreparation: (
			v: LoadedList<T[keyof T]>,
		) => LoadedList<T[keyof T]> = defRestorePreparation as any,
	): Promise<LoadedData<T[keyof T]>> => {
		const loadingStatus = this.loadingStatus.get(storeName);

		if (loadingStatus?.isLocalLoaded) {
			return prevData;
		}

		// 5. Получить данные из хранилища
		const restoredData = await persistStore.getList(storeName);

		let data;
		if (typeof restoredData === 'undefined') {
			// 6. Если нет восстановленных данных -- использовать данные по-умолчанию
			data = restorePreparation(prevData);
		} else {
			// 7. Если есть восстановленные данные - использовать их для восстановления
			data = restorePreparation(restoredData);
		}

		await persistStore.setList(storeName, data);

		this.updateLoadingStatus(storeName, {
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
