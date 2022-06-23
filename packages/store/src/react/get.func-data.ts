import {MaybeRemoteData} from '@storng/store';

import {
	getCorrect,
	getFailure,
	getLoading,
	getNothing,
} from './func-data/maybe-remote.data';

export const getObjFunc = <A extends Record<string, any>>(
	s: A,
): MaybeRemoteData<A['data']> => {
	if (s.loadingStatus.isLoading) {
		return getLoading<A['data'] | Record<string, never>>({
			data: s?.data,
		});
	}

	if (s.loadingStatus.error) {
		return getFailure<A['data']>({
			data: s.data,
			error: s.loadingStatus.error,
		});
	}

	if (Object.keys(s.data).length) {
		return getCorrect<A['data']>({
			data: s.data,
		});
	}

	return getNothing<A['data']>();
};
