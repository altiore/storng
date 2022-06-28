import {Route} from '@storng/common';

import {StoreCache} from './store.cache';
import {StoreLocal} from './store.local';
import {StoreRemote} from './store.remote';
import {FetchType, KeyNames, StoreStructure} from './types';

export class Store<T extends Record<string, T[keyof T]>> {
	public cache: StoreCache<T>;
	public local: StoreLocal<StoreStructure<T>>;
	public remote: StoreRemote;
	// в миллисекундах
	public autoRemoveErrorIn = 7000;

	public authStorage?: keyof T;
	public name: string;

	constructor(
		name: string,
		version: number,
		entityKeyNames: KeyNames<StoreStructure<T>>,
		customFetch: FetchType,
		prefix = '',
		authStorage?: keyof T,
		autoRemoveErrorIn?: number,
		updateTokenRoute?: Route,
	) {
		this.cache = new StoreCache<T>(name, authStorage);
		this.name = name;
		this.local = new StoreLocal<StoreStructure<T>>(
			name,
			version,
			entityKeyNames,
		);
		this.remote = new StoreRemote(
			customFetch,
			prefix,
			this.cache.getAuthToken.bind(this.cache),
			this.logout.bind(this),
			updateTokenRoute,
		);
		this.authStorage = authStorage;
		this.autoRemoveErrorIn = autoRemoveErrorIn ?? this.autoRemoveErrorIn;
	}

	async remove(): Promise<void> {
		await this.local.deleteStorage();
		// TODO: возможно, нужно так же удалить данные из кэша
	}

	async logout(): Promise<void> {
		// TODO: удалить данные из локального хранилища
		// TODO: возможно удалить данные из кэша
	}
}
