import {
	LoadedList,
	MaybeRemoteData,
	MaybeRemoteListData,
	getInitDataList,
} from '@storng/store';

import {
	getCorrectList,
	getFailureList,
	getLoadingList,
	getNothingList,
} from './func-data/maybe-remote-list.data';
import {
	getCorrect,
	getFailure,
	getLoading,
	getNothing,
} from './func-data/maybe-remote.data';

import {sortData} from '../sync.object.helpers/sort-order';

export const getObjFunc = <A extends Record<string, any>>(
	s?: A,
): MaybeRemoteData<A> => {
	if (!s?.loadingStatus) {
		return getLoading<A | Record<string, never>>({
			data: {},
		});
	}

	if (s.loadingStatus.isLoading) {
		return getLoading<A | Record<string, never>>({
			data: s?.data,
		});
	}

	if (s.loadingStatus.error) {
		return getFailure<A>({
			data: s.data,
			error: s.loadingStatus.error,
		});
	}

	if (s.data && Object.keys(s.data).length) {
		return getCorrect<A>({
			data: s.data,
		});
	}

	return getNothing<A>();
};

export const getListFunc = <A extends Record<string, any>>(
	s?: LoadedList<A>,
): MaybeRemoteListData<Omit<LoadedList<A>, 'loadingStatus'>> => {
	if (!s?.loadingStatus) {
		return getLoadingList<A>({
			data: sortData(s?.data ?? [], s?.filter?.sort),
			filter: s?.filter ?? {},
			paginate: s?.paginate ?? getInitDataList(false).paginate,
		});
	}

	if (s.loadingStatus.isLoading) {
		return getLoadingList<A>({
			data: sortData(s.data, s.filter?.sort),
			filter: s.filter,
			paginate: s.paginate,
		});
	}

	if (s.loadingStatus.error) {
		return getFailureList<A>({
			data: sortData(s.data, s.filter?.sort),
			error: s.loadingStatus.error,
			filter: s.filter,
			paginate: s.paginate,
		});
	}

	if (Object.keys(s.data).length) {
		return getCorrectList<A>({
			data: sortData(s.data, s.filter?.sort),
			filter: s.filter,
			paginate: s.paginate,
		});
	}

	return getNothingList<A>({
		filter: s.filter,
		paginate: s.paginate,
	});
};

export const getItemFromListFunc =
	<A extends Record<string, any>>(s?: LoadedList<A>) =>
	(id: string): MaybeRemoteData<A> => {
		if (!s?.loadingStatus) {
			return getLoading<A>({
				data: {},
			});
		}

		const item = s.data.find((el) => el.id === id);
		if (s.loadingStatus.isLoading) {
			return getLoading<A>({
				data: item ?? {},
			});
		}

		if (s.loadingStatus.error) {
			return getFailure<A>({
				data: item,
				error: s.loadingStatus.error as any,
			});
		}

		if (item) {
			return getCorrect<A>({
				data: item,
			});
		}

		return getNothing<A>();
	};
