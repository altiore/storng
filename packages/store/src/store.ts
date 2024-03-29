import {Route} from '@storng/common';

import {StoreCache} from './store.cache';
import {StoreLocal} from './store.local';
import {StoreRemote} from './store.remote';
import {
	defListRestorePreparation,
	defObjRestorePreparation,
} from './sync.object.helpers/def.restore.preparation';
import {
	AuthData,
	FetchType,
	KeyNames,
	LIST_FILTER_TABLE_NAME,
	ListPersistStore,
	LoadedData,
	LoadedItem,
	LoadedList,
	LoadingStatus,
	PersistStore,
	StoreStructure,
	StructureType,
} from './types';
import {getInitDataList} from './utils';

const getDataPreparationByData =
	<T>(data: T) =>
	(s: LoadedItem<T[keyof T]>): LoadedItem<T[keyof T]> => ({
		data,
		loadingStatus: s.loadingStatus,
	});

const GET_CLEAR_OBJ_DATA =
	<T = any>(initial: LoadedItem<T>['data'] = {}) =>
	(): LoadedItem<T> => ({
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
		...getInitDataList(false, new Date().getTime()),
		data: initial,
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
		updateTokenRoute?: Route<any, any>,
		publicStorages: Array<keyof T> = [],
		withFingerprint?: boolean,
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
			this.getAuthToken.bind(this),
			this.logout.bind(this),
			this.updateAuthData.bind(this),
			updateTokenRoute,
			withFingerprint,
		);
		this.authStorage = authStorage;
		this.autoRemoveErrorIn = autoRemoveErrorIn ?? this.autoRemoveErrorIn;
		this.publicStorages = publicStorages;
	}

	async getAuthToken(): Promise<string | false> {
		const authToken = this.cache.getAuthToken();
		if (authToken) {
			return authToken;
		}

		if (this.authStorage) {
			const initAuth = GET_CLEAR_OBJ_DATA<AuthData>()();
			const authObj = await this.restoreData<AuthData>(
				this.authStorage,
				this.local.itemStorage(),
				initAuth,
			);

			if (authObj?.data?.accessToken) {
				return authObj.data.accessToken;
			}
		}

		return false;
	}

	async remove(): Promise<void> {
		await this.local.deleteStorage();
		// TODO: возможно, нужно так же удалить данные из кэша
	}

	async logout(): Promise<void> {
		const entityKeys = Array.from(this.loadingStatus.keys());
		await Promise.all(
			entityKeys.map(async (key) => {
				if (!this.publicStorages.includes(key)) {
					const struct = this.cache.structure.get(key);
					if (!struct) {
						// если нет структуры, то мы не знаем как правильно удалять сущность,
						// поэтому просто удаляем таблицу
						return await this.local.delList(key as any);
					}
					const isPersist = struct.isPersist;
					if (struct.type === StructureType.ITEM) {
						let persistStore: PersistStore<T> | undefined = undefined;
						if (isPersist) {
							persistStore = this.local.itemStorage();
						}

						return await this.updateData(
							key,
							GET_CLEAR_OBJ_DATA(struct?.initData.data as any),
							persistStore,
						);
					} else if (struct.type === StructureType.LIST) {
						let persistListStore: ListPersistStore<T> | undefined = undefined;
						if (isPersist) {
							persistListStore = this.local.listStorage();
						}

						return await this.updateListData(
							key,
							GET_CLEAR_LIST_DATA(),
							persistListStore,
						);
					}
				}
			}),
		);

		// Так же нужно очистить данные о фильтрах таблиц
		await this.local.delList(LIST_FILTER_TABLE_NAME as any);
	}

	subscribeItem = (
		storeName: keyof T,
		subscriber: (value: LoadedItem<T[keyof T]>) => void,
		restorePreparation: (
			v: LoadedItem<T[keyof T]>,
		) => LoadedItem<T[keyof T]> = defObjRestorePreparation as any,
		persistStore?: PersistStore<T>,
		initData?: T[keyof T],
	): void => {
		const loadingStatus = this.loadingStatus.get(storeName);

		if (loadingStatus?.isLocalLoading) {
			// 1. Если восстановление данных в процессе, отложить подписку элемента на данные
			setTimeout(() => {
				this.subscribeItem.bind(this)(
					storeName,
					subscriber,
					restorePreparation,
					persistStore,
					initData,
				);
			}, 100);
			return;
		}

		// 2. добавляем подписчика
		const item = this.cache.subscribeItem(
			storeName,
			subscriber,
			Boolean(persistStore),
			initData,
		);

		if (!persistStore || loadingStatus?.isLocalLoaded) {
			// 3. Если данные уже восстановлены или мы вообще не храним их в локальном хранилище, --
			//    отправить данные текущему подписчику
			this.updateLoadingStatus(storeName, {
				isLocalLoaded: true,
			});
			subscriber(item);
			return;
		}

		this.updateLoadingStatus(storeName, {
			isLocalLoading: true,
		});

		this.restoreData(storeName, persistStore, item, restorePreparation as any)
			.then((data) => {
				this.updateLoadingStatus(storeName, {
					isLocalLoading: false,
				});
				if (!this.loadingStatus.get(storeName)?.declinedRestore) {
					this.cache.updateData(storeName, data, false);
					subscriber(data);
				}
			})
			.catch((err) => {
				console.error(err);
				this.updateLoadingStatus(storeName, {
					isLocalLoaded: false,
				});
			});
	};

	subscribeList = (
		storeName: keyof T,
		subscriber: (value: LoadedList<T[keyof T]>) => void,
		restorePreparation: (
			v: LoadedList<T[keyof T]>,
		) => LoadedList<T[keyof T]> = defListRestorePreparation as any,
		persistStore?: ListPersistStore<T>,
		onFetch?: (store: any) => (a: any) => Promise<any>,
	): void => {
		const loadingStatus = this.loadingStatus.get(storeName);

		if (loadingStatus?.isLocalLoading) {
			// 1. Если восстановление данных в процессе, отложить подписку элемента на данные
			setTimeout(() => {
				this.subscribeList.bind(this)(
					storeName,
					subscriber,
					restorePreparation,
					persistStore,
					onFetch,
				);
			}, 100);
			return;
		}

		// 2. добавляем подписчика
		const list = this.cache.subscribeList(
			storeName,
			subscriber,
			Boolean(persistStore),
		);

		// отправляем запрос не чаще чем раз в секунду. Это нужно для того, чтоб устранить
		// эффект повторной загрузки данных, если есть несколько подписчиков на одни и те же данные
		// TODO: убедиться, что на практике 1 секунды хватает, чтоб избавиться от повторных запросов
		const xSecAgo = 1;

		if (!persistStore || loadingStatus?.isLocalLoaded) {
			this.updateLoadingStatus(storeName, {
				isLocalLoaded: true,
			});

			// 3. Если данные были загружены более х-ти секунд назад, то загрузить данные
			if (
				onFetch &&
				new Date().getTime() - list.loadingStatus.updatedAt > xSecAgo * 1000
			) {
				onFetch(this)({
					...(list.filter ?? {}),
					limit: list.paginate.limit,
					page: list.paginate.page,
				})
					.then()
					.catch(console.error);
			} else {
				// 4. Если мы не загружаем данные - отправить их подписчику
				subscriber(list);
			}

			return;
		}

		this.updateLoadingStatus(storeName, {
			isLocalLoading: true,
		});

		this.restoreListData(
			storeName,
			persistStore,
			list,
			restorePreparation as any,
		)
			.then((data) => {
				this.updateLoadingStatus(storeName, {
					isLocalLoading: false,
				});
				if (!this.loadingStatus.get(storeName)?.declinedRestore) {
					// 3. Если данные были загружены более х-ти секунд назад, то загрузить данные
					if (
						onFetch &&
						new Date().getTime() - data.loadingStatus.updatedAt > xSecAgo * 1000
					) {
						onFetch(this)({
							...((data as LoadedList<T[keyof T]>).filter ?? {}),
							limit: (data as LoadedList<T[keyof T]>).paginate.limit,
							page: (data as LoadedList<T[keyof T]>).paginate.page,
						})
							.then()
							.catch(console.error);
					} else {
						this.cache.updateData(storeName, data, false);
						subscriber(data as LoadedList<T[keyof T]>);
					}
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

		if (loadingStatus?.isLocalLoading) {
			// 0. Если данные, которые уперлись в уже существующие данные обновляют isLoading в true,
			// то такие данные нет смысла откладывать. Они только ухудшат ситуацию, ведь мы через
			// мгновение получим обновленные загруженные данные, которые сейчас ожидают обработки
			if (getData(GET_CLEAR_OBJ_DATA()()).loadingStatus.isLoading) {
				return Promise.resolve();
			}
			// 1. Если восстановление данных в процессе, отложить обновление данных
			setTimeout(() => {
				this.updateData.bind(this)(key, getData, persistStore);
			}, 200);
			return Promise.resolve();
		}

		if (persistStore) {
			this.updateLoadingStatus(key, {
				isLocalLoading: true,
			});

			const existingData = this.cache.getData(key);
			if (existingData) {
				const newData1 = getData(existingData.data);
				if (
					// Эта проверка уменьшает количество генераций, потому что пропускает генерацию страницы,
					// если следующая установка не меняет флаг загрузки данных isLoading на false
					existingData.data.loadingStatus.isLoading !== true ||
					newData1.loadingStatus.isLoading !== true
				) {
					await persistStore.setItem(key, newData1);
					this.cache.updateData(key, newData1);
				}
			} else {
				const prevData =
					(await persistStore.getItem(key)) ?? GET_CLEAR_OBJ_DATA()();
				const newData = getData(prevData);

				await persistStore.setItem(key, newData);
				this.cache.updateData(key, newData);
			}
		} else {
			this.cache.updateData(key, getData);
		}

		this.updateLoadingStatus(key, {
			declinedRestore: false,
			isLocalLoading: false,
		});

		return Promise.resolve();
	};

	updateListData = async (
		storeName: keyof T,
		getData: (data: LoadedList<T[keyof T]>) => LoadedList<T[keyof T]>,
		persistStore?: ListPersistStore<T>,
		onFetch?: (filters: any) => Promise<any>,
	): Promise<void> => {
		this.updateLoadingStatus(storeName, {
			declinedRestore: true,
		});
		const loadingStatus = this.loadingStatus.get(storeName);

		if (loadingStatus?.isLocalLoading) {
			// 0. Если данные, которые уперлись в уже существующие данные обновляют isLoading в true,
			// то такие данные нет смысла откладывать. Они только ухудшат ситуацию, ведь мы через
			// мгновение получим обновленные загруженные данные, которые сейчас ожидают обработки
			if (getData(GET_CLEAR_LIST_DATA()()).loadingStatus.isLoading) {
				return Promise.resolve();
			}
			// 1. Если восстановление данных в процессе, отложить обновление данных

			setTimeout(() => {
				this.updateListData.bind(this)(
					storeName,
					getData,
					persistStore,
					onFetch,
				);
			}, 200);
			return Promise.resolve();
		}

		let newData;
		if (persistStore) {
			this.updateLoadingStatus(storeName, {
				isLocalLoading: true,
			});

			// сначала меняем локальное хранилище - оно всегда синхронизировано с реальными данными
			const prevData = await persistStore.getList(storeName);
			newData = getData(prevData as any) as any;
			await persistStore.setList(storeName, newData);

			const existingCache = this.cache.getData(storeName);
			if (existingCache?.data) {
				if (
					// нет смысла обновлять данные еще раз, если они уже в статусе загрузки
					// экономим количество генераций (React)
					existingCache.data.loadingStatus.isLoading === false ||
					newData.loadingStatus.isLoading === false
				) {
					this.cache.updateData(storeName, newData);
				}
			}
		} else {
			newData = this.cache.updateData(storeName, getData as any);
		}

		if (onFetch && newData) {
			onFetch({
				...(newData.filter ?? {}),
				limit: newData.paginate.limit,
				page: newData.paginate.page,
			})
				.then()
				.catch(console.error);
		}

		this.updateLoadingStatus(storeName, {
			declinedRestore: false,
			isLocalLoading: false,
		});

		return Promise.resolve();
	};

	restoreData = async <P = T[keyof T]>(
		storeName: keyof T,
		persistStore: PersistStore<T>,
		prevData: LoadedItem<P>,
		restorePreparation: (
			v: LoadedItem<P>,
		) => LoadedItem<P> = defObjRestorePreparation as any,
	): Promise<LoadedItem<P>> => {
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
		) => LoadedList<T[keyof T]> = defListRestorePreparation as any,
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
