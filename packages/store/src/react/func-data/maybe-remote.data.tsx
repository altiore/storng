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
	<A,>(a: {data: A | Record<string, never>} = {data: {}}): MaybeRemoteData<A> =>
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
