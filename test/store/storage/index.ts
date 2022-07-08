import {Store} from '@storng/store';

import {mockSuccessItemFetch} from './mock.fetch';
import {StoreType} from './store.type';

export let store: Store<StoreType>;

export const getStore = (
	name: string,
	mockFetch = mockSuccessItemFetch,
): Store<StoreType> => {
	store = new Store<StoreType>(
		name,
		1,
		{
			auth_public: 'id',
			notify: 'id',
			public_common: 'id',
			users: 'id',
		},
		mockFetch,
	);
	return store;
};
