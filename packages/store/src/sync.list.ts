import {DataRes, ErrorOrInfo, GetScope, Route} from '@storng/common';

import {Store} from './store';
import {defRestoreListPreparation} from './sync.object.helpers/def.restore.list.preparation';
import {getUpdater} from './sync.object.helpers/get-updater';
import {prepareActions} from './sync.object.helpers/prepare-actions';
import {
	ActionListHandlers,
	LoadedList,
	MaybeRemoteData,
	ScopeHandlers,
	SubscriberType,
	SyncObjectType,
} from './types';

export function syncList<
	StoreState extends Record<string, StoreState[keyof StoreState]>,
	Key extends keyof StoreState = keyof StoreState,
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	OtherRoutes extends Record<string, any> = Record<string, never>,
>(
	scope: GetScope<Routes, Key> | Key,
	scopeHandlers: ScopeHandlers<StoreState, Key, Routes, OtherRoutes>,
	initData?: Partial<StoreState[Key]>,
	persistData?: boolean,
	restorePreparation: (
		v: LoadedList<StoreState[Key]>,
	) => LoadedList<StoreState[Key]> = defRestoreListPreparation,
): SyncObjectType<Routes, StoreState[Key], OtherRoutes> {
	const result =
		(
			store: Store<StoreState>,
			dataPreparer: (
				value: LoadedList<StoreState[Key]>,
			) => MaybeRemoteData<LoadedList<StoreState[Key]>>,
		) =>
		(subscriber: SubscriberType<StoreState[Key]>) => {
			try {
				const storeName: Key =
					typeof scope === 'object' ? (scope.NAME as Key) : scope;

				const shouldPersistStore =
					typeof persistData === 'boolean'
						? persistData
						: typeof scope === 'object';

				const persistStorage = shouldPersistStore
					? store.local.listStorage()
					: undefined;

				store.subscribe<MaybeRemoteData<LoadedList<StoreState[Key]>>>(
					storeName,
					subscriber,
					dataPreparer as any,
					restorePreparation as any,
					persistStorage as any,
					initData,
				);
				return () => store.unsubscribe(storeName, subscriber);
			} catch (err) {
				console.error(err);
			}
		};

	prepareActions<StoreState, Key, Routes, OtherRoutes>(
		result,
		scope,
		scopeHandlers,
		getUpdater<StoreState>(scope, persistData as any),
		initData,
	);

	return result as any;
}

const requestHandler = <T extends Record<string, any> = Record<string, any>>(
	s: LoadedList<T>,
): LoadedList<T> => ({
	data: s.data,
	loadingStatus: {
		...s.loadingStatus,
		isLoading: true,
	},
});

const failureHandler = <T extends Record<string, any> = Record<string, any>>(
	s: LoadedList<T>,
	_,
	remote: {res: ErrorOrInfo; route: Route},
): LoadedList<T> => ({
	data: s.data,
	loadingStatus: {
		...s.loadingStatus,
		error: remote.res,
		isLoading: false,
	},
});

syncList.nothing = {
	request: requestHandler,
	success: (s): LoadedList<any> => {
		return {
			data: s.data as LoadedList<any>['data'],
			loadingStatus: {
				...s.loadingStatus,
				error: undefined,
				isLoading: false,
				updatedAt: new Date().getTime(),
			},
		};
	},
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as ActionListHandlers;

syncList.replace = {
	request: requestHandler,
	success: (
		s,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedList<any> => ({
		data: remote?.res.data || data || [],
		loadingStatus: {
			error: undefined,
			isLoaded: true,
			isLoading: false,
			updatedAt: new Date().getTime(),
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as ActionListHandlers;

const profile = {
	sortBy: 'createdAt',
};

const usersList = [
	{
		createdAt: 1,
		id: 1,
	},
	{
		createdAt: 2,
		id: 2,
	},
	{
		createdAt: 3,
		id: 3,
	},
];

// subscribe
const getData = (uList: any[], filter: any) => {
	return uList.sort(filter);
};
