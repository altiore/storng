import {LoadedData} from '../types';

export const defRestorePreparation = <T = any>(
	s: LoadedData<T>,
): LoadedData<T> => {
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
	return s;
};
