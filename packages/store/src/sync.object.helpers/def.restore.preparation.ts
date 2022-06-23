import {LoadedItem} from '../types';

export const defRestorePreparation = <T = any>(
	s: LoadedItem<T>,
): LoadedItem<T> => {
	if (typeof s?.loadingStatus?.isLoading === 'boolean') {
		return {
			data: {...s.data},
			loadingStatus: {
				error: undefined,
				initial: false,
				isLoaded: s.loadingStatus.isLoaded,
				isLoading: false,
			},
		};
	}

	console.error('NO DATA >>>>>>', s);
	return s;
};
