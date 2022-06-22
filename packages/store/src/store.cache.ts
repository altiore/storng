import {
	AuthData,
	LoadedItem,
	LoadedList,
	PersistStore,
	StructureType,
} from './types';

type LoadedData<T> = LoadedItem<T[keyof T]> | LoadedList<keyof T, T[keyof T]>;

type ObjKey<T extends Record<string, T[keyof T]>> = {
	type: StructureType;
	initData: LoadedData<T>;
	name: keyof T;
};

type DataAndSubs<T extends Record<keyof T, T[keyof T]>> = {
	data: LoadedData<T>;
	subscribers: Array<(val: any) => void>;
	persistStore: PersistStore<T>;
};

type WeakStore<T extends Record<string, T[keyof T]>> = WeakMap<
	ObjKey<T>,
	DataAndSubs<T>
>;

const DEF_PREPARE_DATA = (t) => t;

export class StoreCache<T extends Record<string, T[keyof T]>> {
	/**
	 * Структура хранилища должна оставаться неизменной все время
	 * Здесь должен храниться необходимый минимум данных о структуре таблиц в базе данных
	 */
	private structure: Map<keyof T, ObjKey<T>>;

	/**
	 * Название хранилища
	 */
	private name: string;

	/**
	 * Это хранилище в оперативной памяти. Очищается когда никто больше не подписан на эти данные
	 */
	private weakStore: WeakStore<T>;

	/**
	 * Получаем ключ в виде объекта для временных данных
	 */
	private getDataKey(name: keyof T): ObjKey<T> {
		return this.structure.get(name);
	}

	/**
	 * Устанавливаем временные данные (кеш данные в оперативной памяти)
	 */
	private setData(
		key: keyof T,
		data: LoadedData<T>,
		subscribers: Array<(val: any) => void>,
		persistStore: PersistStore<T>,
	): void {
		this.weakStore.set(this.getDataKey(key), {
			data,
			persistStore,
			subscribers,
		});
	}
	/**
	 * Проверяем существование временных данных (кеш данных в оперативной памяти)
	 */
	private hasData(key: keyof T): boolean {
		return this.weakStore.has(this.getDataKey(key));
	}
	/**
	 * Получаем временные данные (кеш данные из оперативной памяти)
	 */
	private getData(key: keyof T): DataAndSubs<T> {
		return this.weakStore.get(this.getDataKey(key));
	}
	/**
	 * Удаляем временные данные (кеш данные из оперативной памяти)
	 */
	private deleteData(key: keyof T): void {
		let keyPointer = this.getDataKey(key);
		this.weakStore.delete(keyPointer);
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		keyPointer = null;
	}

	constructor(name: string) {
		this.name = name;
		// TODO: возможно, здесь лучше использовать обычный Map
		this.weakStore = new WeakMap() as WeakStore<T>;
		this.structure = new Map();
	}

	public addItem(key: keyof T, initData: Partial<T[keyof T]> = {}): void {
		this.structure.set(key, {
			initData: {
				data: initData,
				loadingStatus: {
					error: undefined,
					isLoaded: false,
					isLoading: false,
				},
			},
			name: key,
			type: StructureType.ITEM,
		});
	}

	// public addList(key: keyof T): void {
	//   this.structure.set(key, {
	//     initData: {
	//       data: [],
	//       id: key,
	//       loadingStatus: {
	//         error: undefined,
	//         isLoaded: false,
	//         isLoading: false,
	//       },
	//     },
	//     keyPath: 'id',
	//     name: key,
	//     type: StructureType.LIST,
	//   });
	// }

	public async getDataAsync(
		key: keyof T,
		persistStore: PersistStore<T>,
	): Promise<LoadedData<T>> {
		if (this.hasData(key)) {
			const curData = this.getData(key);
			return curData.data;
		} else {
			// 1. Восстанавливаем данные
			let data = persistStore ? await persistStore.getItem(key) : undefined;
			if (typeof data === 'undefined') {
				// 2. Если не удалось восстановить, создаем новые из начальных значений
				const keyData = this.getDataKey(key);
				data = keyData.initData;
			}

			return data;
		}
	}

	public async getAuthData(
		persistStore: PersistStore<T>,
		key?: keyof T,
	): Promise<LoadedItem<AuthData>> {
		let authData: LoadedItem<AuthData>;
		if (key) {
			authData = (await this.getDataAsync(key, persistStore)) as any;
		}

		return (
			authData || {
				data: {},
				loadingStatus: {
					error: undefined,
					isLoaded: false,
					isLoading: false,
				},
			}
		);
	}

	public async subscribe<ResultData = LoadedData<T>>(
		key: keyof T,
		subscriber: (value: ResultData) => void,
		persistStore: PersistStore<T>,
		prepareDataForSubscriber: (
			value: LoadedData<T>,
		) => ResultData = DEF_PREPARE_DATA as any,
		restorePreparation: (
			value: LoadedData<T>,
		) => LoadedData<T> = DEF_PREPARE_DATA,
	): Promise<void> {
		console.log('store.cache subscribe', {
			key,
			getData: Boolean(this.getData(key)),
			hasData: this.hasData(key),
		});
		if (this.hasData(key)) {
			const curData = this.getData(key);
			curData.subscribers.push(subscriber);
			subscriber(prepareDataForSubscriber(curData.data));
		} else {
			// 1. Восстанавливаем данные
			let data = persistStore ? await persistStore.getItem(key) : undefined;
			if (typeof data === 'undefined') {
				// 2. Если не удалось восстановить, создаем новые из начальных значений
				const keyData = this.getDataKey(key);
				data = keyData.initData;
			} else {
				const restorePreparedData = restorePreparation
					? restorePreparation(data)
					: data;
				if (JSON.stringify(data) !== JSON.stringify(restorePreparedData)) {
					data = restorePreparedData;
					await this.updateData(
						key,
						DEF_PREPARE_DATA,
						persistStore,
						prepareDataForSubscriber,
					);
				}
			}

			this.setData(key, data, [subscriber], persistStore);

			subscriber(prepareDataForSubscriber(data));
		}
	}

	public unsubscribe(key: keyof T, subscriber: (value: any) => void): void {
		console.log('store.cache subscribe', {
			key,
			getData: Boolean(this.getData(key)),
			hasData: this.hasData(key),
		});
		if (this.hasData(key)) {
			const curData = this.getData(key);

			const subscriberRemoveIndex = curData.subscribers.findIndex(
				(el) => el === subscriber,
			);
			if (subscriberRemoveIndex !== -1) {
				curData.subscribers.splice(subscriberRemoveIndex, 1);
			}

			if (!curData.subscribers?.length) {
				this.deleteData(key);
			}
		}
	}

	public async updateData<ResultData>(
		key: keyof T,
		getData: (data: LoadedData<T>) => LoadedData<T>,
		persistStore?: PersistStore<T>,
		prepareData: (value: LoadedData<T>) => ResultData = DEF_PREPARE_DATA as any,
	): Promise<void> {
		if (this.hasData(key)) {
			const curData = this.getData(key);
			const newData = getData(curData.data);

			this.setData(key, newData, curData.subscribers, curData.persistStore);
			// Разослать данные всем подписчикам
			curData.subscribers.forEach((subscriber) => {
				subscriber(prepareData(newData));
			});

			if (persistStore) {
				await persistStore.setItem(key, newData);
			}
		} else {
			if (persistStore) {
				const prevData = await persistStore.getItem(key);
				const dataKey = this.getDataKey(key);

				const newData = getData(prevData || dataKey.initData);
				await persistStore.setItem(key, newData);
			}
		}
	}
}
