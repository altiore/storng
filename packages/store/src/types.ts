import {
	ErrorOrInfo,
	GetActionFunc,
	Paginated,
	ResError,
	Route,
} from '@storng/common';

import {Store} from './store';

export interface LoadingStatus {
	declinedRestore: boolean;
	isLocalLoaded: boolean;
	isLocalLoading: boolean;
}

export interface LoadingStatusRemote<
	Error extends ErrorOrInfo = {
		errors?: Array<ResError>;
		message?: string;
		ok: boolean;
	},
> {
	error: Error | undefined;
	// устанавливается в true, когда данные были успешно загружены
	isLoaded: boolean;
	// устанавливается в true, когда данные загружаются
	isLoading: boolean;
	// последний момент синхронизации данных с удаленными данными в миллисекундах
	updatedAt: number;
}

export interface LoadedItem<
	Item extends Record<string, any>,
	Error extends ErrorOrInfo = {
		errors?: Array<ResError>;
		message?: string;
		ok: boolean;
	},
> {
	data?: Partial<Item>;

	loadingStatus: LoadingStatusRemote<Error>;
}

export interface LoadedList<
	Item extends Record<string, any>,
	Error extends ErrorOrInfo = {
		errors?: Array<ResError>;
		message?: string;
		ok: boolean;
	},
> {
	data: Array<Item>;

	filter: Record<string, any>;

	loadingStatus: LoadingStatusRemote<Error>;

	paginate: Omit<Paginated<any>, 'data'>;
}

export type LoadedData<T> = LoadedItem<T> | LoadedList<T>;

export type PersistStore<T extends Record<keyof T, T[keyof T]>> = {
	getItem: (tableName: keyof T, key?: string) => Promise<any>;
	setItem: (tableName: keyof T, value: any) => Promise<any>;
	deleteStore: () => Promise<void>;
};

export type ListPersistStore<T extends Record<keyof T, T[keyof T]>> = {
	getItem: (tableName: keyof T, key?: string) => Promise<any>;
	setItem: (tableName: keyof T, value: any) => Promise<any>;
	getList: (tableName: keyof T) => Promise<LoadedList<T[keyof T]>>;
	setList: (
		tableName: keyof T,
		values: Array<T[keyof T]>,
	) => Promise<Array<T[keyof T]>>;
	deleteStore: () => Promise<void>;
};

export enum StructureType {
	ITEM = '___item',
	LIST = '___list',
}

export type KeyNames<StoreState> = {
	[P in keyof StoreState]: string | string[] | null;
};

export type StoreStructure<StoreType> = {
	[P in keyof StoreType]: {
		key: StoreType[P] extends ArrayLike<any> ? string : 'id';
		value: StoreType[P];
	};
};

export type SubscriberType<T> = (state: MaybeRemoteData<T>) => void;
export type SubscriberListType<T> = (state: MaybeRemoteListData<T>) => void;

export type SubsObj<Item> = (
	subscriber: SubscriberType<Item> | SubscriberListType<Item>,
) => Promise<() => void>;

export type SyncListType<
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	OtherRoutes extends Record<string, any> = Record<string, never>,
> = {
	[P in keyof Routes]: GetActionFunc<Routes[P]>;
} &
	{
		[P in keyof OtherRoutes]: GetActionFunc<OtherRoutes[P]>;
	} & {
		currentPage: (fetchActionName?: keyof Routes) => SelectorType;
		oneById: SelectorType;
	};

export type SyncObjectType<
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	OtherRoutes extends Record<string, any> = Record<string, never>,
> = {
	[P in keyof Routes]: GetActionFunc<Routes[P]>;
} &
	{
		[P in keyof OtherRoutes]: GetActionFunc<OtherRoutes[P]>;
	} & {
		item: SelectorType;
	};

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

export type IsOrNo = <R = null>(mapping: {is: R; no: R}) => R;

export type MaybeRemoteData<
	A extends any = Record<string, any>,
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

export type MaybeRemoteListData<
	A extends Record<string, any>,
	E extends ErrorOrInfo = {
		errors?: Array<ResError>;
		message?: string;
		ok: boolean;
	},
> = <R = null>(mapping: {
	correct:
		| ((a: {
				data: A[];
				paginate: Omit<Paginated<any>, 'data'>;
				filter?: Record<string, any>;
				error?: E;
		  }) => R)
		| R;
	nothing:
		| ((a: {
				data?: A[];
				paginate: Omit<Paginated<any>, 'data'>;
				filter?: Record<string, any>;
				error?: E;
		  }) => R)
		| R;
	failure:
		| ((a: {
				data?: A[];
				paginate?: Omit<Paginated<any>, 'data'>;
				filter?: Record<string, any>;
				error: E;
		  }) => R)
		| R;
	loading:
		| ((a: {
				data?: A[];
				paginate?: Omit<Paginated<any>, 'data'>;
				filter?: Record<string, any>;
				error?: E;
		  }) => R)
		| R;
}) => R;

export const LIST_FILTER_TABLE_NAME = '___list_filters';

export type SelectorType<R = any> = {
	defaultValue?: R;
	dependencies: Array<string | SelectorType>;
	subscribe?: (
		store: Store<any>,
	) => (subscriber: (store: Store<any>) => (data: any) => any) => () => void;
	transform: (...args: Array<any>) => R;
};
