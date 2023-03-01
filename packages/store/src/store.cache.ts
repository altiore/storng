import {
	AuthData,
	LoadedData,
	LoadedItem,
	LoadedList,
	StructureType,
} from './types';
import {getInitData, getInitDataList} from './utils';

type ObjKey<T extends Record<string, T[keyof T]>> = {
	type: StructureType;
	initData: LoadedData<T[keyof T]>;
	isPersist: boolean;
	name: keyof T;
};

type DataAndSubs<T extends Record<keyof T, T[keyof T]>> = {
	data: LoadedData<T[keyof T]>;
	subscribers: Array<(val: any) => void>;
};

type Store<T extends Record<string, T[keyof T]>> = WeakMap<
	ObjKey<T>,
	DataAndSubs<T>
>;

export class StoreCache<T extends Record<string, T[keyof T]>> {
	/**
	 * Структура хранилища должна оставаться неизменной все время
	 * Здесь должен храниться необходимый минимум данных о структуре таблиц в базе данных
	 */
	public structure: Map<keyof T, ObjKey<T>>;

	/**
	 * Название хранилища
	 */
	private name: string;

	/**
	 * Это хранилище в оперативной памяти. Очищается когда никто больше не подписан на эти данные
	 */
	private weakStore: Store<T>;

	/**
	 * это значение хранит имя записи для хранения данных авторизации
	 */
	private readonly authStorage?: keyof T;

	constructor(name: string, authStorage?: keyof T) {
		this.name = name;
		this.authStorage = authStorage;
		// TODO: возможно, здесь лучше использовать обычный Map
		this.weakStore = new Map() as Store<T>;
		this.structure = new Map<keyof T, ObjKey<T>>();
	}

	/**
	 * Получаем ключ в виде объекта для временных данных
	 */
	public getDataKey = (name: keyof T): ObjKey<T> | undefined => {
		return this.structure.get(name);
	};

	/**
	 * Устанавливаем временные данные (кеш данные в оперативной памяти)
	 */
	private setData = (
		key: keyof T,
		data: LoadedData<T[keyof T]>,
		subscribers: Array<(val: any) => void>,
	): void => {
		const objKey = this.getDataKey(key);
		if (!objKey) {
			throw new Error('Вы пытаетесь установить данные с неизвестным ключом');
		}

		this.weakStore.set(objKey, {
			data,
			subscribers,
		});
	};
	/**
	 * Получаем временные данные (кеш данные из оперативной памяти)
	 */
	public getData = (key: keyof T): DataAndSubs<T> | undefined => {
		const objKey = this.getDataKey(key);

		if (!objKey || !this.weakStore.has(objKey)) {
			return undefined;
		}
		return this.weakStore.get(objKey);
	};
	/**
	 * Удаляем временные данные (кеш данные из оперативной памяти)
	 */
	private deleteData = (key: keyof T): void => {
		let keyPointer = this.getDataKey(key);
		if (keyPointer) {
			this.weakStore.delete(keyPointer);
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			keyPointer = undefined;
		}
	};

	public addItem = (
		key: keyof T,
		isPersist = true,
		initData?: T[keyof T],
	): ObjKey<T> => {
		const structureInfo: ObjKey<T> = {
			initData: getInitData(isPersist, initData),
			isPersist,
			name: key,
			type: StructureType.ITEM,
		};
		this.structure.set(key, structureInfo);
		return structureInfo;
	};

	public addList = (storeName: keyof T, isPersist = true): ObjKey<T> => {
		const structureInfo: ObjKey<T> = {
			initData: getInitDataList(isPersist),
			isPersist,
			name: storeName,
			type: StructureType.LIST,
		};
		this.structure.set(storeName, structureInfo);
		return structureInfo;
	};

	public getDataSync = (key: keyof T): LoadedData<T[keyof T]> | false => {
		const curData = this.getData(key);
		if (curData) {
			return curData.data;
		}

		return false;
	};

	public getAuthToken = (): string | false => {
		if (this.authStorage) {
			const authData = this.getDataSync(
				this.authStorage,
			) as LoadedItem<AuthData>;
			if (authData) {
				return authData?.data?.accessToken ?? false;
			}
		}

		return false;
	};

	public subscribeItem = <ResultData = LoadedItem<T[keyof T]>>(
		key: keyof T,
		subscriber: (value: ResultData) => void,
		isPersist = true,
		initData?: T[keyof T],
	): LoadedItem<T[keyof T]> => {
		let keyData = this.getDataKey(key);

		if (!keyData) {
			keyData = this.addItem(key, isPersist, initData);
		}

		let data: LoadedItem<T[keyof T]>;

		const curData = this.getData(key);
		if (curData) {
			data = curData.data as LoadedItem<T[keyof T]>;
			curData.subscribers.push(subscriber);
		} else {
			data = (keyData as ObjKey<T>).initData as LoadedItem<T[keyof T]>;
			this.setData(key, data, [subscriber]);
		}

		return data;
	};

	public subscribeList = <ResultData = LoadedList<T[keyof T]>>(
		storeName: keyof T,
		subscriber: (value: ResultData) => void,
		isPersist = true,
	): LoadedList<T[keyof T]> => {
		let keyData = this.getDataKey(storeName);

		if (!keyData) {
			keyData = this.addList(storeName, isPersist);
		}

		let data: LoadedList<T[keyof T]>;

		const curData = this.getData(storeName);
		if (curData) {
			data = curData.data as LoadedList<T[keyof T]>;
			curData.subscribers.push(subscriber);
		} else {
			data = (keyData as ObjKey<T>).initData as LoadedList<T[keyof T]>;
			this.setData(storeName, data, [subscriber]);
		}

		return data;
	};

	/**
	 * Возвращает true, если успешно отписан и есть еще другие подписчики.
	 * Возвращает false, если нет подписчиков
	 */
	public unsubscribe = (
		key: keyof T,
		subscriber: (value: any) => void,
	): boolean => {
		const curData = this.getData(key);
		if (curData) {
			const subscriberRemoveIndex = curData.subscribers.findIndex(
				(existingSubscriber) => existingSubscriber === subscriber,
			);
			if (subscriberRemoveIndex !== -1) {
				curData.subscribers.splice(subscriberRemoveIndex, 1);
			}

			if (!curData.subscribers?.length) {
				this.deleteData(key);
				return false;
			}
		} else {
			return false;
		}

		return true;
	};

	public updateData = (
		key: keyof T,
		getData:
			| ((data: LoadedData<T[keyof T]>) => LoadedData<T[keyof T]>)
			| LoadedData<T[keyof T]>,
		runSubscribers = true,
	): LoadedData<T[keyof T]> | void => {
		const curData = this.getData(key);
		if (curData) {
			const newData =
				typeof getData === 'function' ? getData(curData.data) : getData;

			this.setData(key, newData, curData.subscribers);
			// Разослать данные всем подписчикам
			if (runSubscribers) {
				curData.subscribers.forEach((subscriber) => {
					subscriber(newData);
				});
			}

			return newData;
		}
	};
}
