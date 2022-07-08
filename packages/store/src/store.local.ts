import {StoreKey, StoreNames, StoreValue, deleteDB, openDB} from 'idb';
import {DBSchema, OpenDBCallbacks} from 'idb/build/entry';

import {KeyNames, ListPersistStore, PersistStore} from './types';

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
	): OpenDBCallbacks<StoreState> => ({
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
			Object.entries(entityKeyNames).forEach(([key, keyPath]) => {
				if (!db.objectStoreNames.contains(key as any)) {
					// если хранилище key еще не существует
					db.createObjectStore(key as any, {
						autoIncrement: false,
						keyPath: keyPath as any,
					}); // создаем хранилище
				}
			});
		},
	});

	private getConfig(): {
		name: string;
		version: number;
		entityKeyNames: {[P in keyof StoreState]: string};
	} {
		return {
			entityKeyNames: this.entityKeyNames,
			name: this.name,
			version: this.version,
		};
	}

	private async dbPromise() {
		const conf = this.getConfig();
		return await openDB(
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
		values: Array<StoreValue<StoreState, StoreNames<StoreState>>>,
	): Promise<Array<StoreKey<StoreState, StoreNames<StoreState>>>> {
		const db = await this.dbPromise();

		// TODO: удалить, когда будем хранить локальных кэш
		await db.clear(storeName);

		const model = db.transaction(storeName, 'readwrite').objectStore(storeName);

		return Promise.all(
			values.map(async (v) => {
				return await model.put(v);
			}),
		);
	}

	async getList(
		storeName: StoreNames<StoreState>,
	): Promise<
		Array<StoreValue<StoreState, StoreNames<StoreState>>> | undefined
	> {
		const db = await this.dbPromise();

		const model = db.transaction(storeName).objectStore(storeName);

		return await model.getAll();
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
