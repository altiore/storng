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
	error: Error | undefined;
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

export type SubsObj<Item> = (
	subscriber: SubscriberType<Item>,
) => Promise<() => void>;

export type SyncObjectType<
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	Item extends Record<string, any> = Record<string, any>,
	OtherRoutes extends Record<string, any> = Record<string, never>,
> = (Routes extends Record<string, never>
	? {
			[P in keyof OtherRoutes]: OtherRoutes[P] extends undefined
				? (store: any) => () => Promise<void>
				: (store: any) => (data: OtherRoutes[P]) => Promise<void>;
	  }
	: {
			[P in keyof Routes | keyof OtherRoutes]: P extends keyof Routes
				? (store: any) => RequestFunc<Routes[P]>
				: P extends keyof OtherRoutes
				? OtherRoutes[P] extends undefined
					? (store: any) => () => Promise<void>
					: (store: any) => (data: OtherRoutes[P]) => Promise<void>
				: never;
	  }) &
	(<StoreState = any>(store: StoreState) => SubsObj<Item>);

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
	Req extends any = any,
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

export type ScopeHandlers<
	StoreState extends Record<string, StoreState[keyof StoreState]>,
	Key extends keyof StoreState = keyof StoreState,
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	OtherRoutes extends Record<string, any> = Record<string, never>,
> = {
	[P in keyof Routes]: RemoteHandlers<
		StoreState[Key],
		Routes[P] extends Route<infer Req> ? Req : never
	>;
} &
	{[P in keyof OtherRoutes]: RemoteHandlers<StoreState[Key], OtherRoutes[P]>};

export type FetchType = (url: string, init: RequestInit) => Promise<Response>;

export type AuthData =
	| {accessToken: string}
	| null
	| Record<string, never>
	| undefined;

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
