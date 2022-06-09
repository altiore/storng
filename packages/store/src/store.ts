type Store<T extends Record<string, T[keyof T]>> = WeakMap<
	Record<'key', keyof T>,
	DataAndSubs<T>
>;

export type PersistStore<T extends Record<keyof T, T[keyof T]>> = {
	getItem: (key: keyof T) => Promise<any>;
	setItem: (key: keyof T, value: any) => Promise<void>;
};

type DataAndSubs<T extends Record<keyof T, T[keyof T]>> = {
	data: T[keyof T];
	subscribers: Array<(val: T[keyof T]) => void>;
	persistStore: PersistStore<T>;
};

export class WeakStore<T extends Record<string, T[keyof T]>> {
	private static weakStore: any;
	public static getStore<T extends Record<string, T[keyof T]>>(): WeakStore<T> {
		if (WeakStore.weakStore) {
			return WeakStore.weakStore;
		}

		return (WeakStore.weakStore = new WeakStore<T>());
	}

	constructor() {
		this.weakMap = new WeakMap() as Store<T>;
	}

	private keys: Map<keyof T, Record<'key', keyof T>> = new Map();
	private weakMap: Store<T>;

	public async subscribe(
		key: keyof T,
		persistStore: PersistStore<T>,
		subscriber: (value: T[keyof T]) => any,
		initData?: T[keyof T],
	): Promise<void> {
		if (this.has(key)) {
			this.addSubscriber(key, subscriber);
		} else {
			// 1. Восстанавливаем данные или создаем новые
			let data = await persistStore.getItem(key);
			if (!data) {
				data = initData ?? {};
			}

			this.set(key, {data, persistStore, subscribers: [subscriber]});
			subscriber(data);
		}
	}

	public async unsubscribe(
		key: keyof T,
		persistStore: PersistStore<T>,
		subscriber: (value: T[keyof T]) => any,
	): Promise<void> {
		await this.removeSubscriber(key, subscriber, persistStore);
	}

	public async updateData(
		key: keyof T,
		persistStore: PersistStore<T>,
		data: Partial<T[keyof T]>,
		replace?: boolean,
	): Promise<void> {
		await this.updateDataPrivate(key, data, persistStore, replace);
	}

	public has(key: keyof T): boolean {
		return this.keys.has(key);
	}

	private get(key: keyof T): DataAndSubs<T> {
		return this.weakMap.get(this.getKey(key));
	}

	private set(key: keyof T, value: DataAndSubs<T>): void {
		this.weakMap.set(this.getKey(key), value);
	}

	private delete(key: keyof T): void {
		if (this.keys.has(key)) {
			let keyPointer = this.getKey(key);
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			keyPointer = null;
			this.keys.delete(key);
		}
	}

	private addSubscriber(
		key: keyof T,
		subscriber: (value: T[keyof T]) => any,
	): void {
		const curData = this.get(key);
		this.set(key, {
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
		if (this.has(key)) {
			const curData = this.get(key);

			const subscribers = curData.subscribers.filter((el) => el !== subscriber);
			if (subscribers.length) {
				this.set(key, {
					data: curData.data,
					persistStore: curData.persistStore,
					subscribers,
				});
			} else {
				await persistStore.setItem(key, curData.data);
				this.delete(key);
			}
		}
	}

	private async updateDataPrivate(
		key: keyof T,
		data: Partial<T[keyof T]>,
		persistStore: PersistStore<T>,
		replace?: boolean,
	): Promise<void> {
		if (this.has(key)) {
			const curData = this.get(key);
			const newData = replace
				? (data as T[keyof T])
				: {...curData.data, ...data};

			this.set(key, {
				data: newData,
				persistStore: curData.persistStore,
				subscribers: curData.subscribers,
			});
			// Разослать данные всем подписчикам
			curData.subscribers.forEach((subscriber) => subscriber(newData));
		} else {
			await persistStore.setItem(key, data);
		}
	}

	private getKey(key: keyof T): Record<'key', keyof T> {
		if (!this.keys.has(key)) {
			this.keys.set(key, {key});
		}

		return this.keys.get(key);
	}
}
