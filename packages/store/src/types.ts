import {
	DataRes,
	ErrorOrInfo,
	RequestFunc,
	ResBase,
	ResError,
	Route,
} from '@storng/common';

export interface LoadingStatus<
	Error extends ErrorOrInfo = {
		errors?: Array<ResError>;
		message?: string;
		ok: boolean;
	},
> {
	isLoading: boolean;
	isLoaded: boolean;
	error?: Error;
}

export interface LoadedItem<
	Item extends Record<string, any>,
	Error extends ErrorOrInfo = {
		errors?: Array<ResError>;
		message?: string;
		ok: boolean;
	},
> {
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
	subscribe: (subscriber: SubscriberType<Item>) => Promise<() => void>;
};

export type SyncObjectType<
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	Item extends Record<string, any> = Record<string, any>,
	OtherRoutes extends string = string,
> = (Routes extends Record<string, never>
	? {[P in OtherRoutes]: (data?: Partial<Item>) => Promise<void>}
	: {
			[P in keyof Routes | OtherRoutes]: P extends keyof Routes
				? RequestFunc<Routes[P]>
				: (data?: Partial<Item>) => Promise<void>;
	  }) &
	SubsObj<Item>;

export type LocalHandler<
	Data extends Record<string, any> = Record<string, any>,
	Remote = any,
> = (
	state: LoadedItem<Data>,
	data: Partial<Data>,
	remote?: Remote,
) => LoadedItem<Data>;

export type RemoteHandlers<
	Data extends Record<string, any> = Record<string, any>,
	Req extends Record<string, any> = Record<string, any>,
> = {
	request: LocalHandler<Data, {route: Route<Req, ResBase<Data>>; req: Req}>;
	success: LocalHandler<
		Data,
		{route: Route<Req, ResBase<Data>>; res: DataRes<Data>}
	>;
	failure: LocalHandler<
		Data,
		{route?: Route<Req, ResBase<Data>>; res: ErrorOrInfo}
	>;
};

export type FetchType = (url: string, init: RequestInit) => Promise<Response>;

export type MaybeRemoteData<
	A extends Record<string, any>,
	E extends ErrorOrInfo = {
		errors?: Array<ResError>;
		message?: string;
		ok: boolean;
	},
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
