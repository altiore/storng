// import memoize from 'memoize-one';

import {ErrorOrInfo, ResError} from '@storng/common';
import {MaybeRemoteData} from '@storng/store';

import {runFunc} from './func-data.helpers';

const getFailureBase =
	<
		A,
		E extends ErrorOrInfo = {
			errors?: Array<ResError>;
			message?: string;
			ok: boolean;
		},
	>(a: {
		data?: A;
		error: E;
	}): MaybeRemoteData<A, E> =>
	({failure}) => {
		return runFunc(failure, a, failure);
	};
export const getFailure = getFailureBase as typeof getFailureBase;

const getLoadingBase =
	<A,>(a: {data: A | undefined} = {data: undefined}): MaybeRemoteData<A> =>
	({loading, failure}) => {
		return runFunc(loading, a, failure);
	};
export const getLoading = getLoadingBase as typeof getLoadingBase;

const getCorrectBase =
	<A,>(a: {data: A}): MaybeRemoteData<A> =>
	({correct, failure}) => {
		return runFunc(correct, a, failure);
	};
export const getCorrect = getCorrectBase as typeof getCorrectBase;

const getNothingBase =
	<A,>(): MaybeRemoteData<A> =>
	({nothing, failure}) => {
		return runFunc(nothing, {}, failure);
	};
export const getNothing = getNothingBase as typeof getNothingBase;

// export const combineTwo = <A, B>(
// 	a: MaybeRemoteData<A>,
// 	b: MaybeRemoteData<B>,
// ): MaybeRemoteData<{first: A; second: B}> =>
// 	a<any>({
// 		correct: (first) =>
// 			b({
// 				correct: ((second: B) => getCorrect({first, second})) as any,
// 				loading: () => getLoading(),
// 				failure: ((e: {error: Error}) => getFailure<B>(e)) as any,
// 				nothing: () => getNothing(),
// 			}),
// 		loading: () => getLoading(),
// 		failure: (e: {error: Error}) => getFailure<A>(e),
// 		nothing: () => getNothing(),
// 	});

// export const combine = <A,>(a: MaybeRemoteData<A>[], params: A[] = []): any => {
// 	if (a.length === 1) {
// 		return a[0]({
// 			correct: ((param: A) => getCorrect([...params, param])) as any,
// 			loading: getLoading,
// 			failure: getFailure as any,
// 			nothing: getNothing,
// 		});
// 	} else {
// 		const item = a.shift() as any;
// 		return item({
// 			correct: (param: any) => combine(a, [...params, param]),
// 			loading: getLoading,
// 			failure: getFailure,
// 			nothing: getNothing,
// 		});
// 	}
// };
