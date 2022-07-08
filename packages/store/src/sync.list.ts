import {DataRes, ErrorOrInfo, GetScope, Route} from '@storng/common';

import {Store} from './store';
import {defRestorePreparation} from './sync.object.helpers/def.restore.preparation';
import {getListUpdater} from './sync.object.helpers/get-list-updater';
import {prepareActions} from './sync.object.helpers/prepare-actions';
import {
	LoadedList,
	MaybeRemoteData,
	ScopeHandlers,
	SubscriberListType,
	SyncObjectType,
} from './types';
import {deepAssign} from './utils';

export function syncList<
	StoreState extends Record<string, StoreState[keyof StoreState]>,
	Key extends keyof StoreState = keyof StoreState,
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	OtherRoutes extends Record<string, any> = Record<string, never>,
>(
	scope: GetScope<Routes, Key> | Key,
	scopeHandlers: ScopeHandlers<StoreState, Key, Routes, OtherRoutes>,
	persistData?: boolean,
	restorePreparation: (
		v: LoadedList<StoreState[Key]>,
	) => LoadedList<StoreState[Key]> = defRestorePreparation as any,
): SyncObjectType<Routes, StoreState[Key], OtherRoutes> {
	const result =
		(
			store: Store<StoreState>,
			dataPreparer: (
				value: LoadedList<StoreState[Key]>,
			) => MaybeRemoteData<LoadedList<StoreState[Key]>>,
		) =>
		(subscriber: SubscriberListType<StoreState[Key]>) => {
			try {
				const storeName: Key =
					typeof scope === 'object' ? (scope.NAME as Key) : scope;

				const shouldPersistStore =
					typeof persistData === 'boolean'
						? persistData
						: typeof scope === 'object';

				const persistStorage = shouldPersistStore
					? store.local.listStorage<StoreState>()
					: undefined;

				store.subscribeList<MaybeRemoteData<LoadedList<StoreState[Key]>>>(
					storeName,
					subscriber,
					dataPreparer as any,
					restorePreparation as any,
					persistStorage,
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
		getListUpdater<StoreState>(scope, persistData as any) as any,
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
			data: s.data,
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
} as any;

syncList.update = {
	request: requestHandler,
	success: (
		s,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedList<any> => ({
		data: {
			...s.data,
			...(remote?.res.data || data || {}),
		},
		loadingStatus: {
			error: undefined,
			isLoaded: true,
			isLoading: false,
			updatedAt: new Date().getTime(),
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;

syncList.replace = {
	request: requestHandler,
	success: (s, data, remote: {res: DataRes; route: Route}): LoadedList<any> => {
		return {
			data: (remote?.res.data as any) || data || [],
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
	success: (s, data): LoadedList<any> => ({
		data: data || [],
		loadingStatus: {
			error: undefined,
			isLoaded: false,
			isLoading: false,
			updatedAt: new Date().getTime(),
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;

syncList.deepMerge = {
	request: requestHandler,
	success: (
		s,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedList<any> => ({
		data: deepAssign(s.data, remote?.res.data || data || []),
		loadingStatus: {
			error: undefined,
			isLoaded: true,
			isLoading: false,
			updatedAt: new Date().getTime(),
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: failureHandler,
} as any;
