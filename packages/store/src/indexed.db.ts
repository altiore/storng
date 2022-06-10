import {WeakStore} from '@storng/store';

/**
 * Эта функция должна вызываться строго после объявления всех сущностей
 */
export function indexedDb(
	name: string,
	version = 1,
	cb: (db: IDBDatabase) => void,
): void {
	const openRequest = window.indexedDB.open(name, version);
	openRequest.onupgradeneeded = function (event) {
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

		console.log('onupgradeneeded', {
			db,
			oldVersion: event.oldVersion,
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
		console.log('db is', db);
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
