import {LoadedList} from '../types';

export const defRestoreListPreparation = <T = any>(
	s: LoadedList<T>,
): LoadedList<T> => {
	if (typeof s?.loadingStatus?.isLoading === 'boolean') {
		return {
			data: s.data,
			loadingStatus: {
				...s.loadingStatus,
				error: undefined,
				isLoading: false,
			},
		};
	}

	console.error('NO LIST DATA >>>>>>', s);
	return s;
};
