import {LoadedData, LoadedList} from '../types';

export const defRestorePreparation = <T = any>(
	s: LoadedData<T>,
): LoadedData<T> => {
	if (typeof s?.loadingStatus?.isLoading === 'boolean') {
		return {
			data: s.data as any,
			filter: (s as LoadedList<any>).filter,
			loadingStatus: {
				...s.loadingStatus,
				error: undefined,
				isLoading: false,
			},
			paginate: (s as LoadedList<any>).paginate,
		};
	}

	console.error('NO DATA >>>>>>', s);
	return s;
};
