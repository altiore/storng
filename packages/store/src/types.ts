import {RequestFunc, ResBase, Route} from '@storng/common';

export interface LoadingStatus<Error = any> {
	isLoading: boolean;
	isLoaded: boolean;
	error?: Error;
}

export interface LoadedItem<Item extends Record<string, any>, Error = any> {
	data: Partial<Item>;

	loadingStatus: LoadingStatus<Error>;
}

export interface LoadedList<Key, Item extends Record<string, any>> {
	id: Key;

	data: Array<Item>;

	loadingStatus: {
		error?: any;
		isLoading: boolean;
		isLoaded: boolean;
	};
}

export type PersistStore<T extends Record<keyof T, T[keyof T]>> = {
	getItem: (tableName: keyof T, key?: string) => Promise<any>;
	setItem: (tableName: keyof T, value: any) => Promise<any>;
	deleteStore: () => Promise<void>;
};

export enum StructureType {
	ITEM = 'item',
	LIST = 'list',
}

export type KeyNames<StoreState> = {[P in keyof StoreState]: string};

export type StoreStructure<StoreType> = {
	[P in keyof StoreType]: {
		key: StoreType[P] extends ArrayLike<any> ? string : 'id';
		value: StoreType[P];
	};
};

export type SubscriberType<T> = (state: MaybeRemoteData<LoadedItem<T>>) => any;

export type SubsObj<Item> = {
	subscribe: (subscriber: SubscriberType<Item>) => Promise<() => Promise<void>>;
};

export type SyncObjectType<
	Routes extends Record<string, Route<any, any>> = any,
	Item extends Record<string, any> = Record<string, any>,
> = {[P in keyof Routes]: RequestFunc<Routes[P]>} & {
	subscribe: (subscriber: SubscriberType<Item>) => Promise<() => Promise<void>>;
};

export type RemoteHandlers<Data extends Record<string, any> = any> = {
	request: (
		state: LoadedItem<Data>,
		data: any,
		route: Route,
	) => LoadedItem<Data>;
	success: (
		state: LoadedItem<Data>,
		data: any,
		res: ResBase,
	) => LoadedItem<Data>;
	failure: (
		state: LoadedItem<Data>,
		data: any,
		res: ResBase,
	) => LoadedItem<Data>;
};

export type FetchType = (url: string, init: RequestInit) => Promise<Response>;

export type MaybeRemoteData<
	A extends Record<string, any>,
	E extends {error?: any; message: string} = {error?: any; message: string},
> = <R = null>(mapping: {
	correct: ((a: {data: A}) => R) | R;
	nothing: (() => R) | R;
	failure: ((a: {data?: A | null; error: E}) => R) | R;
	loading: ((a: {data?: A | null}) => R) | R;
}) => R;

export type IsOrNo = <R = null>(mapping: {
	is: (() => R) | R;
	no: (() => R) | R;
}) => R;
