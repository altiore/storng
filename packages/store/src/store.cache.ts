import {getObjFunc} from './react/get.func-data';
import {
	LoadedItem,
	LoadedList,
	MaybeRemoteData,
	PersistStore,
	StructureType,
} from './types';

type ObjKey<T extends Record<string, T[keyof T]>> = {
	type: StructureType;
	initData: LoadedItem<T[keyof T]> | LoadedList<keyof T, T[keyof T]>;
	name: keyof T;
};

type DataAndSubs<T extends Record<keyof T, T[keyof T]>> = {
	data: LoadedItem<T[keyof T]>;
	subscribers: Array<(val: MaybeRemoteData<LoadedItem<T[keyof T]>>) => void>;
	persistStore: PersistStore<T>;
};

type WeakStore<T extends Record<string, T[keyof T]>> = WeakMap<
	ObjKey<T>,
	DataAndSubs<T>
>;

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
		data: LoadedItem<T[keyof T]>,
		subscribers: Array<(val: MaybeRemoteData<LoadedItem<T[keyof T]>>) => void>,
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

		if (window?.onbeforeunload) {
			window.onbeforeunload = this.beforeUnload.bind(this);
		}
	}

	async beforeUnload() {
		const promises = [];
		this.structure.forEach((val, key) => {
			const curData = this.getData(key);

			console.log('beforeUnload', {
				key,
				val,
			});
			if (curData) {
				promises.push(curData.persistStore.setItem(key, curData.data));
			}
		});
		await Promise.all(promises);
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

	public async subscribe(
		key: keyof T,
		subscriber: (value: MaybeRemoteData<LoadedItem<T[keyof T]>>) => void,
		persistStore: PersistStore<T>,
	): Promise<void> {
		if (this.hasData(key)) {
			const curData = this.getData(key);
			curData.subscribers.push(subscriber);
			subscriber(getObjFunc<LoadedItem<T[keyof T]>>(curData.data));
		} else {
			// 1. Восстанавливаем данные
			let data = await persistStore.getItem(key);
			if (typeof data === 'undefined') {
				// 2. Если не удалось восстановить, создаем новые из начальных значений
				const keyData = this.getDataKey(key);
				data = keyData.initData;
			}

			this.setData(key, data, [subscriber], persistStore);
			subscriber(getObjFunc<LoadedItem<T[keyof T]>>(data));
		}
	}

	public async unsubscribe(
		key: keyof T,
		subscriber: (value: MaybeRemoteData<LoadedItem<T[keyof T]>>) => void,
	): Promise<void> {
		if (this.hasData(key)) {
			const curData = this.getData(key);

			const subscriberRemoveIndex = curData.subscribers.findIndex(
				(el) => el === subscriber,
			);
			if (subscriberRemoveIndex !== -1) {
				curData.subscribers.splice(subscriberRemoveIndex, 1);
			}

			if (!curData.subscribers?.length) {
				await curData.persistStore.setItem(key, curData.data);
				this.deleteData(key);
			}
		}
	}

	public async updateData(
		key: keyof T,
		getData: (data: LoadedItem<T[keyof T]>) => LoadedItem<T[keyof T]>,
		persistStore: PersistStore<T>,
	): Promise<void> {
		if (this.hasData(key)) {
			const curData = this.getData(key);
			const newData = getData(curData.data);

			this.setData(key, newData, curData.subscribers, curData.persistStore);
			// Разослать данные всем подписчикам
			curData.subscribers.forEach((subscriber) =>
				subscriber(getObjFunc<LoadedItem<T[keyof T]>>(newData)),
			);
		} else {
			const prevData = await persistStore.getItem(key);
			const dataKey = this.getDataKey(key);
			await persistStore.setItem(
				key,
				getData(prevData?.data || dataKey.initData),
			);
		}
	}
}
