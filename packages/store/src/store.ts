import {StoreCache} from './store.cache';
import {StoreLocal} from './store.local';
import {StoreRemote} from './store.remote';
import {KeyNames, StoreStructure} from './types';

export class Store<T extends Record<string, T[keyof T]>> {
	public cache: StoreCache<T>;
	public local: StoreLocal<StoreStructure<T>>;
	public remote: StoreRemote;

	constructor(
		name: string,
		version: number,
		entityKeyNames: KeyNames<StoreStructure<T>>,
		customFetch?: unknown,
	) {
		this.cache = new StoreCache<T>(name);
		this.local = new StoreLocal<StoreStructure<T>>(
			name,
			version,
			entityKeyNames,
		);
		this.remote = new StoreRemote((customFetch as any) || fetch);
	}
}
