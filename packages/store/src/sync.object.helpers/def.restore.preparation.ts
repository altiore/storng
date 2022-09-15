import {FilterBy} from '@storng/common';
import {getInitData, getInitDataList} from '@storng/store';

import {LoadedData, LoadedItem, LoadedList} from '../types';

export const defListRestorePreparation = <T = any>(
	s: LoadedData<T>,
	filterBy?: FilterBy<T>,
): LoadedData<T> => {
	if (typeof s?.loadingStatus?.isLoading === 'boolean') {
		return {
			data: s.data as any,
			filter: {
				...(filterBy?.filter ?? {}),
				...(filterBy?.order?.order && filterBy?.order?.orderBy
					? {
							sort: `${filterBy.order.orderBy},${filterBy.order.order}`,
					  }
					: {}),
				...(s as LoadedList<any>).filter,
			},
			loadingStatus: {
				...s.loadingStatus,
				error: undefined,
				isLoading: false,
			},
			paginate: {
				...(filterBy?.paginate ?? {}),
				...(s as LoadedList<any>).paginate,
			},
		};
	}

	console.error('NO DATA >>>>>>', s);
	return getInitDataList(true);
};

export const getDefListRestorePreparationWithFilters = <T = any>(
	filterBy?: FilterBy<T>,
) => {
	return (s: LoadedList<T>): LoadedData<T> => {
		return defListRestorePreparation(s, filterBy);
	};
};

export const defObjRestorePreparation = <T extends Record<string, any> = any>(
	s?: LoadedItem<T>,
): LoadedItem<T> => {
	if (typeof s?.loadingStatus?.isLoading === 'boolean') {
		return {
			data: s.data as any,
			loadingStatus: {
				...s.loadingStatus,
				error: undefined,
				isLoading: false,
			},
		};
	}

	console.error('NO DATA >>>>>>', s);
	return getInitData<T>(true);
};
