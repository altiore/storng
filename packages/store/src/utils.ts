import {Paginated} from '@storng/common';
import {LoadedItem, LoadedList} from '@storng/store';

type DeepPartial<T> = T extends Record<string, any>
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
	  }
	: T;

export function deepAssign<T extends Record<string, any> = Record<string, any>>(
	_target: T,
	...sources: Array<DeepPartial<T>>
): T {
	const target = {..._target};
	for (const source of sources) {
		for (const k in source) {
			const vs = source[k];
			const vt = target[k];
			if (Array.isArray(vs) || Array.isArray(vt)) {
				target[k] = [...(vt || []), ...(vs || [])] as any;
				continue;
			}
			if (Object(vs) === vs && Object(vt) === vt) {
				target[k] = deepAssign(vt, {...vs});
				continue;
			}
			target[k] = source[k] as any;
		}
	}
	return target;
}

export function getIsExpiredSoon(
	accessToken: string,
	offsetSeconds = 60,
): boolean {
	if (!accessToken) {
		throw new Error('Нет ключа для проверки');
	}
	const jwtPayload: {exp: number; iat: number; id?: string} = JSON.parse(
		atob(accessToken.split('.')[1]),
	);
	const expireDate = new Date(jwtPayload.exp * 1000);

	// добавляем количество минут, чтоб был запас времени для обновления запроса
	const compareDate = new Date(new Date().getTime() + offsetSeconds * 1000);
	const diff = compareDate.getTime() - expireDate.getTime();

	return diff >= 0;
}

export function getInitData<T>(
	initData: Partial<T[keyof T]>,
	isLoading: boolean,
): LoadedItem<T[keyof T]> {
	return {
		data: initData,
		loadingStatus: {
			error: undefined,
			isLoaded: false,
			isLoading,
			updatedAt: 0,
		},
	};
}

export function getInitDataList<T>(
	isLoading: boolean,
	updatedAt = 0,
): LoadedList<T> {
	return {
		data: [],
		filter: {},
		loadingStatus: {
			error: undefined,
			isLoaded: false,
			isLoading,
			updatedAt,
		},
		paginate: {
			count: 0,
			limit: 10,
			page: 1,
			pageCount: 0,
			total: 0,
		},
	};
}

export const getResPaginate = (
	res: Omit<Paginated<any>, 'data'>,
	prevPaginate: Omit<Paginated<any>, 'data'> = getInitDataList(false).paginate,
): Omit<Paginated<any>, 'data'> => {
	return {
		count: res?.count ?? prevPaginate.count,
		limit: prevPaginate.limit,
		page: res?.page ?? prevPaginate.page,
		pageCount: res?.pageCount ?? prevPaginate.pageCount,
		total: res?.total ?? prevPaginate.total,
	};
};
