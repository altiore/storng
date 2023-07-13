import {StoreKey, StoreNames, StoreValue, deleteDB, openDB} from 'idb';
import {DBSchema, IDBPDatabase, OpenDBCallbacks} from 'idb/build/entry';

import {getInitDataList} from '@storng/store';

import {
	KeyNames,
	LIST_FILTER_TABLE_NAME,
	ListPersistStore,
	LoadedList,
	PersistStore,
} from './types';

type TT<T> = {
	[LIST_FILTER_TABLE_NAME]: {
		key: keyof T;
		value: any;
	};
};

export class StoreLocal<StoreState extends DBSchema> {
	public name: string;
	public version: number;
	public entityKeyNames: KeyNames<StoreState>;

	constructor(
		name: string,
		version: number,
		entityKeyNames: KeyNames<StoreState>,
	) {
		this.name = name;
		this.version = version;
		this.entityKeyNames = entityKeyNames;
	}

	private handlersObj = (
		entityKeyNames: KeyNames<StoreState>,
	): OpenDBCallbacks<StoreState & TT<StoreState>> => ({
		blocked() {
			console.log(
				'есть другое соединение к той же базе ' +
					'\nи оно не было закрыто после срабатывания на нём db.onversionchange',
			);
		},
		blocking() {
			console.log('blocking');
		},
		terminated() {
			console.log('terminated');
		},
		upgrade(db) {
			Object.entries(entityKeyNames).forEach(([storeName, keyPath]) => {
				if (!db.objectStoreNames.contains(storeName as any)) {
					// если хранилище key еще не существует
					db.createObjectStore(storeName as any, {
						autoIncrement: false,
						keyPath: keyPath,
					}); // создаем хранилище
				}
			});

			if (!db.objectStoreNames.contains(LIST_FILTER_TABLE_NAME as any)) {
				db.createObjectStore(LIST_FILTER_TABLE_NAME as any, {
					autoIncrement: false,
					keyPath: 'id',
				}); // создаем хранилище для фильтров таблиц
			}
		},
	});

	private getConfig(): {
		name: string;
		version: number;
		entityKeyNames: {[P in keyof StoreState]: string | string[] | null};
	} {
		return {
			entityKeyNames: this.entityKeyNames,
			name: this.name,
			version: this.version,
		};
	}

	private async dbPromise(): Promise<
		IDBPDatabase<StoreState & TT<StoreState>>
	> {
		const conf = this.getConfig();
		return await openDB<StoreState & TT<StoreState>>(
			conf.name,
			conf.version,
			this.handlersObj(conf.entityKeyNames),
		);
	}

	public async addItem(
		storeName: StoreNames<StoreState>,
		value: StoreValue<StoreState, StoreNames<StoreState>>,
		key?: StoreKey<StoreState, StoreNames<StoreState>>,
	): Promise<StoreKey<StoreState, StoreNames<StoreState>>> {
		const db = await this.dbPromise();

		const model = db.transaction(storeName, 'readwrite').objectStore(storeName);

		const preparedKey = key ?? 'id';
		const preparedValue =
			typeof value[preparedKey as any] === 'undefined'
				? {
						[preparedKey as any]: storeName,
						...value,
				  }
				: value;

		return await model.add(preparedValue);
	}

	public async putItem(
		storeName: StoreNames<StoreState>,
		value: StoreValue<StoreState, StoreNames<StoreState>>,
		key: StoreKey<StoreState, StoreNames<StoreState>> | 'id' = 'id',
	): Promise<StoreKey<StoreState, StoreNames<StoreState>>> {
		const db = await this.dbPromise();

		const model = db.transaction(storeName, 'readwrite').objectStore(storeName);

		const preparedKey = key ?? 'id';
		const preparedValue =
			typeof value[preparedKey as any] === 'undefined'
				? {
						[preparedKey as any]: storeName,
						...value,
				  }
				: value;
		return await model.put(preparedValue);
	}

	async getItem(
		storeName: StoreNames<StoreState>,
		key?: StoreKey<StoreState, StoreNames<StoreState>>,
	): Promise<StoreValue<StoreState, StoreNames<StoreState>> | undefined> {
		const db = await this.dbPromise();

		const model = db.transaction(storeName).objectStore(storeName);

		const res = await model.get(key || (storeName as any));
		if ((res as any)?.id === storeName) {
			delete (res as any)?.id;
		}

		return res;
	}

	async delItem(
		storeName: StoreNames<StoreState>,
		key?: StoreKey<StoreState, StoreNames<StoreState>>,
	): Promise<void> {
		const db = await this.dbPromise();

		return await db.delete(storeName, key ?? (storeName as any));
	}

	public async setList(
		storeName: StoreNames<StoreState>,
		loadedList: LoadedList<StoreValue<StoreState, StoreNames<StoreState>>>,
	): Promise<Array<StoreKey<StoreState, StoreNames<StoreState>>>> {
		const db = await this.dbPromise();

		// // TODO: удалить, когда будем хранить локальный кэш
		await db.clear(storeName);

		const trn = db.transaction(
			[storeName, LIST_FILTER_TABLE_NAME as any],
			'readwrite',
		);

		const model = trn.objectStore(storeName);

		const putResult = await Promise.all(
			loadedList.data.map(async (v) => {
				return await model.put(v);
			}),
		);

		const filterModel = trn.objectStore(LIST_FILTER_TABLE_NAME);
		await filterModel.put({
			filter: loadedList.filter,
			id: storeName,
			loadingStatus: loadedList.loadingStatus,
			paginate: loadedList.paginate,
		});

		return putResult;
	}

	async getList(
		storeName: StoreNames<StoreState>,
	): Promise<LoadedList<StoreValue<StoreState, StoreNames<StoreState>>>> {
		const db = await this.dbPromise();
		const trn = db.transaction([storeName, LIST_FILTER_TABLE_NAME as any]);

		const model = trn.objectStore(storeName);
		const list = await model.getAll();

		const filterModel = trn.objectStore(LIST_FILTER_TABLE_NAME);
		const filterModelData = await filterModel.get(storeName as any);

		const init = getInitDataList(true);
		return {
			...init,
			data: list || [],
			filter: {
				...((filterModelData as any)?.filter || {}),
			},
			loadingStatus: {
				...init.loadingStatus,
				isLoaded: Boolean(list?.length),
				...((filterModelData as any)?.loadingStatus || {}),
			},
			paginate: {
				...init.paginate,
				...((filterModelData as any)?.paginate || {}),
			},
		};
	}

	async delList(storeName: StoreNames<StoreState>): Promise<void> {
		const db = await this.dbPromise();

		return await db.clear(storeName);
	}

	async deleteStorage(): Promise<void> {
		return await deleteDB(this.name);
	}

	itemStorage<StoreType>(): PersistStore<StoreType> {
		return {
			deleteStore: this.deleteStorage,
			getItem: async (storeName: keyof StoreType, key?: string) =>
				await this.getItem(storeName as any, key as any),
			setItem: async (storeName: keyof StoreType, value: any) =>
				await this.putItem(storeName as any, value),
		};
	}

	listStorage<StoreType>(): ListPersistStore<StoreType> {
		return {
			deleteStore: this.deleteStorage,
			getItem: async (storeName: keyof StoreType, key?: string) =>
				await this.getItem(storeName as any, key as any),
			getList: async (storeName: keyof StoreType): Promise<any> =>
				await this.getList(storeName as any),
			setItem: async (storeName: keyof StoreType, value: any) =>
				await this.putItem(storeName as any, value),
			setList: async (storeName: keyof StoreType, values: any): Promise<any> =>
				await this.setList(storeName as any, values),
		};
	}
}
