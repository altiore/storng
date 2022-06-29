import {LoadedItem} from '../types';

export const defRestorePreparation = <T = any>(
	s: LoadedItem<T>,
): LoadedItem<T> => {
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

	console.error('NO DATA >>>>>>', s);
	return s;
};
