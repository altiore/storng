import {
	CrudUrl,
	DataRes,
	ErrorOrInfo,
	GetScope,
	Paginated,
	Route,
} from '@storng/common';

import {getItemFromListFunc, getListFunc} from './react/get.func-data';
import {Store} from './store';
import {getListUpdater} from './sync.object.helpers/get-list-updater';
import {prepareActions} from './sync.object.helpers/prepare-actions';
import {LoadedList, ScopeHandlers, StructureType, SyncListType} from './types';
import {getInitDataList, getResPaginate} from './utils';

const getPaginateData = <T>(
	paginate: Partial<Omit<Paginated<any>, 'data'>>,
	s: LoadedList<T[keyof T]>,
) => {
	return {
		...s,
		loadingStatus: {
			...s.loadingStatus,
			isLoading: true,
		},
		paginate: {
			...s.paginate,
			...paginate,
		},
	};
};

const onChangeFilter =
	<
		T extends Record<string, T[keyof T]>,
		Key extends keyof T = keyof T,
		Routes extends Record<string, Route<any, any>> = Record<string, never>,
	>(
		scope: GetScope<Routes, Key> | Key,
		persistData: boolean,
		onFetch: any,
		store: Store<T>,
	) =>
	async (paginate: Partial<Omit<Paginated<any>, 'data'>>): Promise<void> => {
		const storeName: Key =
			typeof scope === 'object' ? (scope.NAME as Key) : scope;

		const shouldPersistStore =
			typeof persistData === 'boolean'
				? persistData
				: typeof scope === 'object';

		const persistStorage = shouldPersistStore
			? store.local.listStorage<T>()
			: undefined;

		await store.updateListData(
			storeName,
			getPaginateData.bind(undefined, paginate) as any,
			persistStorage,
			onFetch.bind(undefined, store)(),
		);
	};

export function syncList<
	StoreState extends Record<string, StoreState[keyof StoreState]>,
	Key extends keyof StoreState = keyof StoreState,
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	OtherRoutes extends Record<string, any> = Record<string, never>,
>(
	scope: GetScope<Routes, Key> | Key,
	scopeHandlers: ScopeHandlers<StoreState, Key, Routes, OtherRoutes>,
	persistData?: boolean,
): SyncListType<
	Routes,
	OtherRoutes & {onChangeFilter: Partial<Omit<Paginated<any>, 'data'>>}
> {
	const result: any = {};
	result.type = StructureType.LIST;

	const shouldPersistStore =
		typeof persistData === 'boolean' ? persistData : typeof scope === 'object';

	prepareActions<StoreState, Key, Routes, OtherRoutes>(
		result,
		scope,
		scopeHandlers,
		getListUpdater<StoreState>(scope, shouldPersistStore) as any,
	);

	result.onChangeFilter = onChangeFilter.bind(
		undefined,
		scope,
		shouldPersistStore,
		result[CrudUrl.getMany],
	);

	const scopeName: keyof StoreState =
		typeof scope === 'object' ? (scope.NAME as keyof StoreState) : scope;

	result.currentPage = {
		defaultValue: getListFunc(),
		dependencies: [scopeName],
		subscribe: (store: Store<any>) => (subscriber) => {
			store.subscribeList(
				scopeName,
				subscriber,
				undefined,
				store.local.listStorage(),
				result?.[CrudUrl.getMany],
			);
			return () => store.unsubscribe(scopeName, subscriber);
		},
		transform: getListFunc,
	};

	result.oneById = {
		defaultValue: getItemFromListFunc(),
		dependencies: [scopeName],
		subscribe: (store: Store<any>) => (subscriber) => {
			store.subscribeList(
				scopeName,
				subscriber,
				undefined,
				store.local.listStorage(),
			);
			return () => store.unsubscribe(scopeName, subscriber);
		},
		transform: getItemFromListFunc,
	};

	return result;
}

const requestHandler = <T extends Record<string, any> = Record<string, any>>(
	s: LoadedList<T>,
): LoadedList<T> => ({
	data: s.data,
	filter: {},
	loadingStatus: {
		...s.loadingStatus,
		isLoading: true,
	},
	paginate: s.paginate,
});

const failureHandler = <T extends Record<string, any> = Record<string, any>>(
	s: LoadedList<T>,
	_,
	remote: {res: ErrorOrInfo; route: Route},
): LoadedList<T> => ({
	data: s.data,
	filter: {},
	loadingStatus: {
		...s.loadingStatus,
		error: remote.res,
		isLoading: false,
	},
	paginate: s.paginate,
});

syncList.nothing = {
	request: requestHandler,
	success: (s: LoadedList<any>): LoadedList<any> => {
		return {
			...s,
			loadingStatus: {
				...s.loadingStatus,
				error: undefined,
				isLoading: false,
			},
		};
	},
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;

syncList.replace = {
	request: requestHandler,
	success: (
		s: LoadedList<any>,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedList<any> => {
		return {
			data: (remote?.res?.data as any) || data || [],
			filter: s.filter,
			loadingStatus: {
				error: undefined,
				isLoaded: true,
				isLoading: false,
				updatedAt: new Date().getTime(),
			},
			paginate: getResPaginate(remote?.res as any, s.paginate),
		};
	},
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;

syncList.createOne = {
	request: requestHandler,
	success: (
		s: LoadedList<any>,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedList<any> => {
		const preparedData = remote?.res?.data || data;
		if (!preparedData.id) {
			return {
				...s,
				loadingStatus: {
					...s.loadingStatus,
					error: {
						message: 'Полученные данные не содержат id',
						ok: false,
					},
					isLoading: false,
				},
			};
		}
		return {
			...s,
			// Если порция значений меньше текущего полученного количества,
			// то добавить элемент в конец массива. Если нет - элемент будет виден на другой странице
			// TODO: учитывать фильтры
			data:
				s.paginate.limit < s.paginate.count
					? [...(s.data || []), preparedData]
					: s.data,
			loadingStatus: {
				...s.loadingStatus,
				error: undefined,
				isLoading: false,
				updatedAt: new Date().getTime(),
			},
			paginate: {
				...s.paginate,
				count:
					s.paginate.limit < s.paginate.count
						? s.paginate.count + 1
						: s.paginate.count,
				pageCount:
					s.paginate.page === s.paginate.pageCount &&
					s.paginate.limit === s.paginate.count
						? s.paginate.pageCount + 1
						: s.paginate.pageCount,
				total: s.paginate.total + 1,
			},
		};
	},
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;

syncList.updateOne = {
	request: requestHandler,
	success: (
		s: LoadedList<any>,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedList<any> => {
		const preparedData = remote?.res?.data || data;
		const id = preparedData?.id;
		if (!id) {
			return {
				...s,
				loadingStatus: {
					...s.loadingStatus,
					error: {
						message: 'Полученные данные не содержат id',
						ok: false,
					},
					isLoading: false,
				},
			};
		}
		const index = s.data.findIndex((el) => el.id === id);
		if (index === -1) {
			console.warn('Не удалось найти существующий элемент. Был создан новый');
			return syncList.createOne.success(s, data, remote);
		}

		return {
			...s,
			data: [
				...s.data.slice(0, index),
				preparedData,
				...s.data.slice(index + 1),
			],
			loadingStatus: {
				error: undefined,
				isLoaded: true,
				isLoading: false,
				updatedAt: new Date().getTime(),
			},
		};
	},
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;

syncList.remove = {
	request: requestHandler,
	success: (): LoadedList<any> => getInitDataList(false, new Date().getTime()),
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;
