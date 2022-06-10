import {WeakStore} from '@storng/store';

/**
 * Эта функция должна вызываться строго после объявления всех сущностей
 */
function indexedDb(
	name: string,
	version = 1,
	cb: (db: IDBDatabase) => void,
): void {
	const openRequest = window.indexedDB.open(name, version);
	openRequest.onupgradeneeded = function (_event) {
		// срабатывает, если на клиенте нет базы данных
		// ...выполнить инициализацию...
		const db = openRequest.result;

		const store = WeakStore.getStore(name);

		// создать необходимые хранилища в структуре базы данных, если их еще нет
		store.dbStructure.forEach((value, key) => {
			if (!db.objectStoreNames.contains(key)) {
				// если хранилище key не существует
				db.createObjectStore(key, {
					autoIncrement: value.autoIncrement,
					keyPath: value.keyPath,
				}); // создаем хранилище
			}
		});

		// удалить лишние хранилища из базы данных, если их больше нет в текущей структуре
		Array.from(db.objectStoreNames).forEach((key) => {
			if (!store.dbStructure.has(key)) {
				db.deleteObjectStore(key);
			}
		});
	};

	openRequest.onerror = function () {
		console.error('Error', openRequest.error);
	};

	openRequest.onsuccess = function () {
		const db = openRequest.result;
		db.onversionchange = function () {
			db.close();
			alert('База данных устарела, пожалуйста, перезагрузите страницу.');
		};

		cb(db);

		db.close();
	};

	openRequest.onblocked = function () {
		// есть другое соединение к той же базе
		// и оно не было закрыто после срабатывания на нём db.onversionchange
		console.log(
			'есть другое соединение к той же базе ' +
				'\nи оно не было закрыто после срабатывания на нём db.onversionchange',
		);
	};
}

export const getPersistStore: any = (name, version = 1) => {
	return {
		getItem: (name: string) => {
			return new Promise((resolve, reject) => {
				indexedDb(name, version, (db) => {
					const transaction = db.transaction(name, 'readonly');

					// получить хранилище объектов для работы с ним
					const model = transaction.objectStore(name);

					const request = model.get(name);

					request.onsuccess = function () {
						resolve(request.result);
					};

					request.onerror = function () {
						console.log('Ошибка', request.error);
						reject(request.error);
					};
				});
			});
		},
		setItem: (name: string, value: any) => {
			return new Promise((resolve, reject) => {
				indexedDb(name, version, (db) => {
					const transaction = db.transaction(name, 'readwrite');

					// получить хранилище объектов для работы с ним
					const model = transaction.objectStore(name);

					const request = model.put(value);

					request.onsuccess = function () {
						// (4)
						console.log('Сущность добавлена в хранилище', request.result);
						resolve(undefined);
					};

					request.onerror = function () {
						console.log('Ошибка', request.error);
						reject(request.error);
					};
				});
			});
		},
	};
};
