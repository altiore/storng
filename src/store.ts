// 1. Хранилище - там где хранятся данные
// 2. Подписчик - это сущность, подписанная на элемент данных в хранилище по ключу (таблица)
// 3. Запись - это данные ключ - значение, где ключи - произвольная строка
// 4. Список - это данные ключ - значение, где ключами являются числа от 0 до ...
// 5. Когда отписывается последний подписчик, данные нужно забэкапить
// 6. При попытке обратиться к данным по тому же ключу - данные должны восстанавливаться

// Бэкап
// 1. Запрос на сохранение данных - асинхронная
// 2. Удаление данных - синхронная процедура

type DataAndSubs<T> = {
	data: T[keyof T];
	subscribers: Array<(val: T[keyof T]) => void>;
};
type Store<T extends Record<string, T[keyof T]>> = WeakMap<
	Record<'key', keyof T>,
	DataAndSubs<T>
>;

export type PersistStore<T extends Record<keyof T, T[keyof T]>> = {
	getItem: (key: keyof T) => Promise<any>;
	setItem: (key: keyof T, value: any) => Promise<void>;
};

type Rec<K, D> = {
	key(): K;
	init(): D;
};

export class WeakStore<T extends Record<string, T[keyof T]>> {
	constructor(persistStore: PersistStore<T>) {
		this.store = new WeakMap() as Store<T>;
		this.persistStore = persistStore;
	}

	private keys: Map<keyof T, Record<'key', keyof T>> = new Map();
	private store: Store<T>;
	private persistStore: PersistStore<T>;

	public async subscribe(
		record: Rec<T[keyof T], keyof T>,
		subscriber: (value: T[keyof T]) => void,
	): Promise<void> {
		const key = record.key();
		if (this.has(key)) {
			this.addSubscriber(key, subscriber);
		} else {
			// 1. Восстанавливаем данные или создаем новые
			let data = await this.persistStore.getItem(key);
			if (!data) {
				data = record.init();
			}

			this.set(key, {data, subscribers: [subscriber]});
			subscriber(data);
		}
	}

	private has(key: keyof T): boolean {
		return this.keys.has(key);
	}

	private get(key: keyof T): DataAndSubs<T> {
		return this.store.get(this.getKey(key));
	}

	private set(key: keyof T, value: DataAndSubs<T>): void {
		this.store.set(this.getKey(key), value);
	}

	private delete(key: keyof T): void {
		if (this.keys.has(key)) {
			this.keys.delete(key);
		}
	}

	private addSubscriber(
		key: keyof T,
		subscriber: (value: T[keyof T]) => void,
	): void {
		const curData = this.get(key);
		this.set(key, {
			data: curData.data,
			subscribers: [...curData.subscribers, subscriber],
		});
		subscriber(curData.data);
	}

	private getKey(key: keyof T): Record<'key', keyof T> {
		if (!this.keys.has(key)) {
			this.keys.set(key, {key});
		}

		return this.keys.get(key);
	}
}
