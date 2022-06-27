import {ErrorOrInfo, GetActionFunc, ResError, Route} from '@storng/common';

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
> = {
	[P in keyof Routes]: GetActionFunc<Routes[P]>;
} &
	{
		[P in keyof OtherRoutes]: GetActionFunc<OtherRoutes[P]>;
	} &
	(<StoreState = any>(store: StoreState) => SubsObj<Item>);

export type ActionHandler<
	Item extends Record<string, any> = Record<string, any>,
	Payload extends any = any,
	Remote extends any = any,
> = (
	s: LoadedItem<Item>,
	payload: Payload,
	remote?: Remote,
) => LoadedItem<Item>;

export type ActionHandlers<
	Item extends Record<string, any> = Record<string, any>,
	Payload extends any = any,
> = {
	request: ActionHandler<Item, Payload>;
	success: ActionHandler<Item, Payload>;
	failure: ActionHandler<Item, Payload>;
};

export type ScopeHandlers<
	StoreState extends Record<string, StoreState[keyof StoreState]>,
	Key extends keyof StoreState = keyof StoreState,
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	OtherRoutes extends Record<string, any> = Record<string, never>,
> = {
	[P in keyof (Routes | OtherRoutes)]:
		| ActionHandlers<
				StoreState[Key],
				Routes[P] extends Route<infer Req> ? Req : never
		  >
		| ActionHandlers<StoreState[Key], OtherRoutes[P]>;
};

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
	correct: ((a: {data: A; error?: E}) => R) | R;
	nothing: ((a: {data?: A; error?: E}) => R) | R;
	failure: ((a: {data?: A; error: E}) => R) | R;
	loading: ((a: {data?: A; error?: E}) => R) | R;
}) => R;
