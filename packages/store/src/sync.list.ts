import {
	CrudUrl,
	DataRes,
	ErrorRes,
	FilterBy,
	GetScope,
	Paginated,
	Route,
} from '@storng/common';

import {getItemFromListFunc, getListFunc} from './react/get.func-data';
import {Store} from './store';
import {getDefListRestorePreparationWithFilters} from './sync.object.helpers/def.restore.preparation';
import {getListUpdater} from './sync.object.helpers/get-list-updater';
import {prepareActions} from './sync.object.helpers/prepare-actions';
import {sortData} from './sync.object.helpers/sort-order';
import {LoadedList, ScopeHandlers, StructureType, SyncListType} from './types';
import {getInitDataList, getResPaginate} from './utils';

const getPaginateData = <T>(
	filterBy: FilterBy<T>,
	s: LoadedList<T[keyof T]>,
) => {
	const prepFilter: Record<string, any> = Object.assign(
		{},
		filterBy?.filter ?? {},
	);
	if (filterBy?.order?.order && filterBy?.order?.orderBy) {
		prepFilter.sort = `${filterBy?.order.orderBy},${filterBy?.order.order}`;
	}
	return {
		...s,
		filter: {
			...s.filter,
			...prepFilter,
		},
		loadingStatus: {
			...s.loadingStatus,
			isLoading: true,
		},
		paginate: {
			...s.paginate,
			...(filterBy.paginate ?? {}),
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
	async ({
		paginate = {},
		order = {},
		filter = {} as any,
	}: FilterBy<T>): Promise<void> => {
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
			getPaginateData.bind(undefined, {filter, order, paginate} as any) as any,
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
	options?: {
		filterBy?: FilterBy;
		getManyAction?: keyof Routes;
		persistData?: boolean;
	},
): SyncListType<
	Routes,
	OtherRoutes & {onChangeFilter: FilterBy<Record<string, any>>}
> {
	const result: any = {};
	result.type = StructureType.LIST;

	const {filterBy, getManyAction, persistData} = options ?? {};
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
		result[getManyAction ?? CrudUrl.getMany],
	);

	const scopeName: keyof StoreState =
		typeof scope === 'object' ? (scope.NAME as keyof StoreState) : scope;

	result.currentPage = (fetchAction?: keyof Routes) => ({
		defaultValue: getListFunc(),
		dependencies: [scopeName],
		subscribe: (store: Store<any>) => (subscriber) => {
			store.subscribeList(
				scopeName,
				subscriber,
				getDefListRestorePreparationWithFilters(filterBy) as any,
				store.local.listStorage(),
				result[fetchAction ?? getManyAction ?? CrudUrl.getMany],
			);
			return () => store.unsubscribe(scopeName, subscriber);
		},
		transform: getListFunc,
	});

	result.oneById = {
		defaultValue: getItemFromListFunc(),
		dependencies: [scopeName],
		subscribe: (store: Store<any>) => (subscriber) => {
			store.subscribeList(
				scopeName,
				subscriber,
				getDefListRestorePreparationWithFilters(filterBy) as any,
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
	filter: s.filter,
	loadingStatus: {
		...s.loadingStatus,
		isLoading: true,
	},
	paginate: s.paginate,
});

const failureHandler = <T extends Record<string, any> = Record<string, any>>(
	s: LoadedList<T>,
	_,
	remote: {res: ErrorRes; route: Route},
): LoadedList<T> => ({
	data: s.data,
	filter: s.filter,
	loadingStatus: {
		...s.loadingStatus,
		error: remote.res,
		isLoading: false,
	},
	paginate: s.paginate,
});

syncList.nothing = {
	request: (s) => s,
	success: (s) => s,
	// eslint-disable-next-line sort-keys
	failure: (s) => s,
} as any;

syncList.replace = {
	request: requestHandler,
	success: (
		s: LoadedList<any>,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedList<any> => {
		return {
			data: sortData(
				(remote?.res?.data?.data as any) || data || [],
				s.filter?.sort,
			),
			filter: s.filter,
			loadingStatus: {
				error: undefined,
				isLoaded: true,
				isLoading: false,
				updatedAt: new Date().getTime(),
			},
			paginate: getResPaginate(remote?.res?.data as any, s.paginate),
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
						errors: [],
						message: 'Полученные данные не содержат id',
						ok: false,
					},
					isLoading: false,
				},
			};
		}
		return {
			...s,
			// Добавить элемент в конец массива
			data: sortData([...(s.data || []), preparedData], s.filter?.sort),
			loadingStatus: {
				...s.loadingStatus,
				error: undefined,
				isLoading: false,
				updatedAt: new Date().getTime(),
			},
			paginate: {
				...s.paginate,
				count:
					s.paginate.limit > s.paginate.count
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
						errors: [],
						message: 'Полученные данные не содержат id',
						ok: false,
					},
					isLoading: false,
				},
			};
		}
		const index = s.data.findIndex((el) => el.id === id);
		if (index === -1) {
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

syncList.deleteOne = {
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
						errors: [],
						message: 'Полученные данные не содержат id',
						ok: false,
					},
					isLoading: false,
				},
			};
		}
		const newData = sortData(
			[...(s.data || []).filter((el) => el.id !== preparedData.id)],
			s.filter?.sort,
		);
		const nextDataLength = newData.length;
		const nextTotal = s.paginate.total - 1;
		return {
			...s,
			data: newData,
			loadingStatus: {
				...s.loadingStatus,
				error: undefined,
				isLoading: false,
				updatedAt: new Date().getTime(),
			},
			paginate: {
				...s.paginate,
				count: nextDataLength,
				pageCount:
					nextTotal % s.paginate.limit === 0
						? s.paginate.pageCount - 1
						: s.paginate.pageCount,
				total: nextTotal,
			},
		};
	},
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;

syncList.createOneHidden = {
	request: (s) => s,
	success: syncList.createOne.success,
	// eslint-disable-next-line sort-keys
	failure: (s) => s,
} as any;

syncList.updateOneHidden = {
	request: (s) => s,
	success: syncList.updateOne.success,
	// eslint-disable-next-line sort-keys
	failure: (s) => s,
} as any;

syncList.deleteOneHidden = {
	request: (s) => s,
	success: syncList.deleteOne.success,
	// eslint-disable-next-line sort-keys
	failure: (s) => s,
} as any;

syncList.remove = {
	request: requestHandler,
	success: (): LoadedList<any> => getInitDataList(false, new Date().getTime()),
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;

syncList.file = {
	request: requestHandler,
	success: (s: LoadedList<any>): LoadedList<any> => {
		return s;
	},
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;

syncList.fileHidden = {
	request: (s) => s,
	success: (s: LoadedList<any>): LoadedList<any> => {
		return s;
	},
	// eslint-disable-next-line sort-keys
	failure: (s) => s,
} as any;

syncList.custom = <T, D = any>(
	cb: (
		a: T[],
		paginate: Omit<Paginated<any>, 'data'>,
		data: D,
	) => Partial<LoadedList<T>>,
): any => ({
	request: requestHandler,
	success: (s: LoadedList<T>, data: D): LoadedList<T> => {
		const res = cb(s.data as any, s.paginate, data);
		return {
			data: res.data ?? [],
			filter: res.filter ?? s.filter,
			loadingStatus: res.loadingStatus ?? {
				error: undefined,
				isLoaded: true,
				isLoading: false,
				updatedAt: new Date().getTime(),
			},
			paginate: res.paginate ?? s.paginate,
		};
	},
	// eslint-disable-next-line sort-keys
	failure: failureHandler as any,
});
