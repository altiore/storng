import memoize from 'memoize-one';

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
export const getFailure = memoize(getFailureBase) as typeof getFailureBase;

const getLoadingBase =
	<A,>(a: {data: A | undefined} = {data: undefined}): MaybeRemoteData<A> =>
	({loading, failure}) => {
		return runFunc(loading, a, failure);
	};
export const getLoading = memoize(getLoadingBase) as typeof getLoadingBase;

const getCorrectBase =
	<A,>(a: {data: A}): MaybeRemoteData<A> =>
	({correct, failure}) => {
		return runFunc(correct, a, failure);
	};
export const getCorrect = memoize(getCorrectBase) as typeof getCorrectBase;

const getNothingBase =
	<A,>(): MaybeRemoteData<A> =>
	({nothing, failure}) => {
		return runFunc(nothing, {}, failure);
	};
export const getNothing = memoize(getNothingBase) as typeof getNothingBase;
