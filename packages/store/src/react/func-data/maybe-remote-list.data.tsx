// import memoize from 'memoize-one';

import {ErrorOrInfo, Paginated, ResError} from '@storng/common';
import {MaybeRemoteListData} from '@storng/store';

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
		data?: A[];
		paginate?: Omit<Paginated<any>, 'data'>;
		filter?: Record<string, any>;
		error: E;
	}): MaybeRemoteListData<A, E> =>
	({failure}) => {
		return runFunc(failure, a, failure);
	};
export const getFailureList = getFailureBase as typeof getFailureBase;

const getLoadingBase =
	<A,>(
		a: {
			data: A[];
			paginate?: Omit<Paginated<any>, 'data'>;
			filter?: Record<string, any>;
		} = {
			data: [],
			filter: {},
			paginate: {count: 0, page: 1, pageCount: 0, total: 0},
		},
	): MaybeRemoteListData<A> =>
	({loading, failure}) => {
		return runFunc(loading, a, failure);
	};
export const getLoadingList = getLoadingBase as typeof getLoadingBase;

const getCorrectBase =
	<A,>(a: {
		data: A[];
		paginate?: Omit<Paginated<any>, 'data'>;
		filter?: Record<string, any>;
	}): MaybeRemoteListData<A> =>
	({correct, failure}) => {
		return runFunc(correct, a, failure);
	};
export const getCorrectList = getCorrectBase as typeof getCorrectBase;

const getNothingBase =
	<A,>({
		filter,
		paginate,
	}: {
		filter: Record<string, any>;
		paginate: Omit<Paginated<any>, 'data'>;
	}): MaybeRemoteListData<A> =>
	({nothing, failure}) => {
		return runFunc(
			nothing,
			{
				filter: filter,
				paginate: paginate,
			},
			failure,
		);
	};
export const getNothingList = getNothingBase as typeof getNothingBase;
