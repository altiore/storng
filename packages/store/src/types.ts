import {
	DataRes,
	ErrorOrInfo,
	GetActionFunc,
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
	error: Error | undefined;
	initial?: boolean;
	isLoaded: boolean;
	isLoading: boolean;
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

export type LoadedData<T> =
	| LoadedItem<T[keyof T]>
	| LoadedList<keyof T, T[keyof T]>;

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

export type SubscriberType<T> = (state: MaybeRemoteData<LoadedItem<T>>) => void;

export type SubsObj<Item> = (
	subscriber: SubscriberType<Item>,
) => Promise<() => void>;

export type SyncObjectType<
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	Item extends Record<string, any> = Record<string, any>,
	OtherRoutes extends Record<string, any> = Record<string, never>,
> = (Routes extends Record<string, never>
	? {
			[P in keyof OtherRoutes]: GetActionFunc<OtherRoutes[P]>;
	  }
	: {
			[P in keyof Routes | keyof OtherRoutes]: P extends keyof Routes
				? GetActionFunc<Routes[P]>
				: P extends keyof OtherRoutes
				? GetActionFunc<OtherRoutes[P]>
				: GetActionFunc;
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
	Req extends Record<string, any> | undefined = undefined,
> = Req extends Record<string, any>
	? {
			request: LocalHandler<Data, {route: Route<Req, ResBase<Data>>; req: Req}>;
			success: LocalHandler<
				Data,
				{route: Route<Req, ResBase<Data>>; res: DataRes<Data>}
			>;
			failure: LocalHandler<
				Data,
				{route?: Route<Req, ResBase<Data>>; res: ErrorOrInfo}
			>;
	  }
	: {
			request: LocalHandler<Data>;
			success: LocalHandler<Data>;
			failure: LocalHandler<Data>;
	  };

export type ScopeHandlers<
	StoreState extends Record<string, StoreState[keyof StoreState]>,
	Key extends keyof StoreState = keyof StoreState,
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	OtherRoutes extends Record<string, any> = Record<string, never>,
> = {
	[P in keyof Routes]:
		| RemoteHandlers<
				StoreState[Key],
				Routes[P] extends Route<infer Req> ? Req : undefined
		  >
		| RemoteHandlers;
} &
	{[P in keyof OtherRoutes]: RemoteHandlers<StoreState[Key], OtherRoutes[P]>};

export type FetchType = (url: string, init: RequestInit) => Promise<Response>;

export type AuthData = Record<'accessToken', string> | Record<string, never>;

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
	failure: ((a: {data?: A; error: E}) => R) | R;
	loading: ((a: {data?: A}) => R) | R;
}) => R;
