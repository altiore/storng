import {LoadedItem, MaybeRemoteData} from '@storng/store';

import {
	getCorrect,
	getFailure,
	getLoading,
	getNothing,
} from './func-data/maybe-remote.data';

// export const getListFunc = <T>(baseData: (store: IStore) => ILoadedList<T>) =>
//   createSelector([baseData], (s) => {
//     if (s.data?.length) {
//       return getCorrect<ILoadedList<T>>(s);
//     }
//     if (s.errorList) {
//       return getFailure<ILoadedList<T>>({
//         error: {
//           name: String(s.errorList.statusCode),
//           message: s.errorList.message,
//         },
//       });
//     }
//     if (s.isLoading) {
//       return getLoading<ILoadedList<T>>(s);
//     }
//
//     return getNothing<ILoadedList<T>>();
//   });
//
// type OneError = Error & {
//   error: any;
// };
//
// export const getOneByIdFunc = <T extends {id: string}>(
//   baseData: (store: IStore) => ILoadedList<T>,
// ) =>
//   createSelector([baseData], (s) => (id: string) => {
//     const elementData = (s.data || []).find((el) => el.id === id);
//     if (s.isLoading) {
//       // Это избавляет от двойного рендера в случае если данные уже есть
//       // с этим кусочком работает лучше чем без него
//       // TODO: написать тесты
//       if (elementData) {
//         return getCorrect<T, OneError>(elementData);
//       }
//       return getLoading<T, OneError>(elementData);
//     }
//     if (elementData) {
//       return getCorrect<T, OneError>(elementData);
//     }
//     // Ошибку нужно проверять в последнюю очередь,
//     // ведь данные могут быть загружены ранее
//     if (s.errorItem?.id === id) {
//       return getFailure<T, OneError>({
//         error: {
//           name: String(s.errorItem.statusCode),
//           message: s.errorItem.message,
//           error: s.errorItem,
//         },
//       });
//     }
//
//     return getNothing<T, OneError>();
//   });

export const getObjFunc = <A extends LoadedItem<any>>(
	s: A,
): MaybeRemoteData<A['data']> => {
	if (s.loadingStatus.isLoading) {
		return getLoading<A['data'] | null>({
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
