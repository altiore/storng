export type PersistStore<T extends Record<keyof T, T[keyof T]>> = {
	getItem: (key: keyof T) => Promise<any>;
	setItem: (key: keyof T, value: any) => Promise<void>;
};

type DataAndSubs<T extends Record<keyof T, T[keyof T]>> = {
	data: T[keyof T];
	subscribers: Array<(val: T[keyof T]) => void>;
	persistStore: PersistStore<T>;
};

type ObjKey<T extends Record<string, T[keyof T]>> = {
	autoIncrement?: boolean;
	initData: Record<string, any>;
	keyPath?: string | string[] | null;
	name: keyof T;
};

type StoreLocal<T extends Record<string, T[keyof T]>> = WeakMap<
	ObjKey<T>,
	DataAndSubs<T>
>;

export class WeakStore<T extends Record<string, T[keyof T]>> {
	private static weakStore: any;
	public name: string;
	public static NAME: string;
	public static getStore<T extends Record<string, T[keyof T]>>(
		name?: string,
	): WeakStore<T> {
		if (WeakStore.weakStore) {
			return WeakStore.weakStore;
		}

		return (WeakStore.weakStore = new WeakStore<T>(name || WeakStore.NAME));
	}

	constructor(name: string) {
		this.name = name;
		this.weakMap = new WeakMap() as StoreLocal<T>;
	}

	// Хранит все имена сущностей, которые мы собираемся хранить в нашей базе данных и никогда не
	// удаляет эти имена. Это нужно, чтоб зафиксировать структуру базы данных
	public dbStructure: Map<keyof T, ObjKey<T>> = new Map();
	private weakMap: StoreLocal<T>;

	public addTable(key: keyof T, initData: T[keyof T], tableOpts: Partial<{keyPath: string, autoIncrement: boolean}> = {autoIncrement: true}): void {
		this.dbStructure.set(key, {
			initData,
			name: key,
			...tableOpts,
		});
	}

	public async subscribe(
		key: keyof T,
		subscriber: (value: T[keyof T]) => any,
		persistStore: PersistStore<T>,
	): Promise<void> {
		if (this.hasData(key)) {
			this.addSubscriber(key, subscriber);
		} else {
			// 1. Восстанавливаем данные или создаем новые
			let data = await persistStore.getItem(key);

			if (!data) {
				const keyData = this.getKey(key);
				data = keyData.initData;
			}

			this.setData(key, {data, persistStore, subscribers: [subscriber]});
			subscriber(data);

		}
	}

	public async unsubscribe(
		key: keyof T,
		subscriber: (value: T[keyof T]) => any,
		persistStore: PersistStore<T>,
	): Promise<void> {
		await this.removeSubscriber(key, subscriber, persistStore);
	}

	public async updateData(
		key: keyof T,
		getData: (data: T[keyof T]) => T[keyof T],
		persistStore: PersistStore<T>,
	): Promise<void> {
		await this.updateDataPrivate(key, getData, persistStore);
	}

	public hasStructure(key: keyof T): boolean {
		return this.dbStructure.has(key);
	}

	public hasData(key: keyof T): boolean {
		return this.weakMap.has(this.getKey(key));
	}

	public getData(key: keyof T): DataAndSubs<T> {
		return this.weakMap.get(this.getKey(key));
	}

	private setData(key: keyof T, value: DataAndSubs<T>): void {
		this.weakMap.set(this.getKey(key), value);
	}

	private deleteLazyDataByKey(key: keyof T): void {
		if (this.dbStructure.has(key)) {
			let keyPointer = this.getKey(key);
			this.weakMap.delete(keyPointer);
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			keyPointer = null;
		}
	}

	private addSubscriber(
		key: keyof T,
		subscriber: (value: T[keyof T]) => any,
	): void {
		const curData = this.getData(key);
		this.setData(key, {
			data: curData.data,
			persistStore: curData.persistStore,
			subscribers: [...curData.subscribers, subscriber],
		});
		subscriber(curData.data);
	}

	private async removeSubscriber(
		key: keyof T,
		subscriber: (value: T[keyof T]) => any,
		persistStore: PersistStore<T>,
	): Promise<void> {
		if (this.hasStructure(key)) {
			const curData = this.getData(key);

			const subscriberRemoveIndex = curData.subscribers.findIndex(
				(el) => el === subscriber,
			);
			if (subscriberRemoveIndex !== -1) {
				curData.subscribers.splice(subscriberRemoveIndex, 1);
			}

			if (curData?.subscribers?.length) {
				this.setData(key, {
					data: curData.data,
					persistStore: curData.persistStore,
					subscribers: curData.subscribers,
				});
			} else {
				await persistStore.setItem(key, curData.data);
				this.deleteLazyDataByKey(key);
			}
		}
	}

	private async updateDataPrivate(
		key: keyof T,
		getData: (data: T[keyof T]) => T[keyof T],
		persistStore: PersistStore<T>,
	): Promise<void> {
		if (this.hasStructure(key) && this.hasData(key)) {
			const curData = this.getData(key);
			const newData = getData(curData?.data || ({} as any));

			this.setData(key, {
				data: newData,
				persistStore: curData.persistStore,
				subscribers: curData.subscribers,
			});
			// Разослать данные всем подписчикам
			curData.subscribers.forEach((subscriber) => subscriber(newData));
		} else {
			const prevData = await persistStore.getItem(key);
			await persistStore.setItem(key, getData(prevData?.data || {}));
		}
	}

	private getKey(name: keyof T): ObjKey<T> {
		return this.dbStructure.get(name);
	}
}
