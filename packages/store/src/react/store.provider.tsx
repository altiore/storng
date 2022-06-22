import React, {PropsWithChildren} from 'react';

import {Store} from '@storng/store';

import {StoreContext} from './store.context';

export interface StoreProviderProps<T extends Record<string, T[keyof T]>> {
	store: Store<T>;
}

export const StoreProvider = <T extends Record<string, T[keyof T]>>({
	children,
	store,
}: PropsWithChildren<StoreProviderProps<T>>): JSX.Element => {
	return (
		<StoreContext.Provider value={store}>{children}</StoreContext.Provider>
	);
};
