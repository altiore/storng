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
	initData: Partial<T>,
	isPersist: boolean,
): LoadedItem<T> {
	return {
		data: initData,
		loadingStatus: {
			error: undefined,
			isLoaded: false,
			isLoading: isPersist,
			updatedAt: 0,
		},
	};
}

export function getInitDataList<T>(isPersist: boolean): LoadedList<T> {
	return {
		data: [],
		loadingStatus: {
			error: undefined,
			isLoaded: false,
			isLoading: isPersist,
			updatedAt: 0,
		},
	};
}
