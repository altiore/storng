import {AuthData, LoadedItem, StructureType} from './types';

type ObjKey<T extends Record<string, T[keyof T]>> = {
	type: StructureType;
	initData: LoadedItem<T[keyof T]>;
	isPersist: boolean;
	name: keyof T;
};

type DataAndSubs<T extends Record<keyof T, T[keyof T]>> = {
	data: LoadedItem<T[keyof T]>;
	subscribers: Array<{
		dataPreparer: (data: LoadedItem<T[keyof T]>) => any;
		subscriber: (val: any) => void;
	}>;
};

type WeakStore<T extends Record<string, T[keyof T]>> = WeakMap<
	ObjKey<T>,
	DataAndSubs<T>
>;

const DEF_PREPARE_DATA = (t: LoadedItem<any>): any => t;

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
	private weakStore: WeakStore<T>;

	/**
	 * это значение хранит имя записи для хранения данных авторизации
	 */
	private readonly authStorage?: keyof T;

	constructor(name: string, authStorage?: keyof T) {
		this.name = name;
		this.authStorage = authStorage;
		// TODO: возможно, здесь лучше использовать обычный Map
		this.weakStore = new WeakMap() as WeakStore<T>;
		this.structure = new Map<keyof T, ObjKey<T>>();
	}

	/**
	 * Получаем ключ в виде объекта для временных данных
	 */
	private getDataKey = (name: keyof T): ObjKey<T> | undefined => {
		return this.structure.get(name);
	};

	/**
	 * Устанавливаем временные данные (кеш данные в оперативной памяти)
	 */
	private setData = (
		key: keyof T,
		data: LoadedItem<T[keyof T]>,
		subscribers: Array<{
			dataPreparer: (data: LoadedItem<T[keyof T]>) => any;
			subscriber: (val: any) => void;
		}>,
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
		initData: Partial<T[keyof T]> = {},
		isPersist = true,
	): ObjKey<T> => {
		const structureInfo: ObjKey<T> = {
			initData: {
				data: initData,
				loadingStatus: {
					error: undefined,
					initial: true,
					isLoaded: false,
					isLoading: true,
				},
			},
			isPersist,
			name: key,
			type: StructureType.ITEM,
		};
		this.structure.set(key, structureInfo);
		return structureInfo;
	};

	public getDataSync = (key: keyof T): LoadedItem<T[keyof T]> | false => {
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
				return authData.data.accessToken ?? false;
			}
		}

		return false;
	};

	public subscribe = <ResultData = LoadedItem<T[keyof T]>>(
		key: keyof T,
		subscriber: (value: ResultData) => void,
		dataPreparer: (
			value: LoadedItem<T[keyof T]>,
		) => ResultData = DEF_PREPARE_DATA,
		initDataData?: Partial<T[keyof T]>,
		isPersist = true,
	): LoadedItem<T[keyof T]> => {
		let keyData = this.getDataKey(key);

		if (!keyData) {
			keyData = this.addItem(key, initDataData, isPersist);
		}

		let data: LoadedItem<T[keyof T]>;

		const curData = this.getData(key);
		if (curData) {
			data = curData.data;
			curData.subscribers.push({dataPreparer, subscriber});
		} else {
			data = (keyData as ObjKey<T>).initData;
			this.setData(key, data, [{dataPreparer, subscriber}]);
		}

		return data;
	};

	public unsubscribe = (
		key: keyof T,
		subscriber: (value: any) => void,
	): void => {
		const curData = this.getData(key);
		if (curData) {
			const subscriberRemoveIndex = curData.subscribers.findIndex(
				(el) => el.subscriber === subscriber,
			);
			if (subscriberRemoveIndex !== -1) {
				curData.subscribers.splice(subscriberRemoveIndex, 1);
			}

			if (!curData.subscribers?.length) {
				this.deleteData(key);
			}
		} else {
			throw new Error(
				'Вы пытаетесь отписать подписчика, но он не был найден среди подписчиков',
			);
		}
	};

	public updateData = (
		key: keyof T,
		getData: (data: LoadedItem<T[keyof T]>) => LoadedItem<T[keyof T]>,
	): void => {
		const curData = this.getData(key);
		if (curData) {
			const newData = getData(curData.data);

			this.setData(key, newData, curData.subscribers);
			// Разослать данные всем подписчикам
			curData.subscribers.forEach(({subscriber, dataPreparer}) => {
				subscriber(dataPreparer(newData));
			});
		}
	};
}
