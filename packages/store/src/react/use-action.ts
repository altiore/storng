import {useCallback, useContext} from 'react';

import {GetActionFunc, Route} from '@storng/common';

import {StoreContext} from './store.context';

export function useAction<T extends Route = Route>(
	action: GetActionFunc<T>,
): T extends Route<infer Req, infer Res>
	? (params?: Req) => Promise<Res>
	: never {
	const store = useContext(StoreContext);

	return useCallback(
		async (
			params?: T extends Route<infer Req, any> ? Req : never,
		): Promise<T extends Route<any, infer Res> ? Res : never> => {
			return (await (action(store) as any)(params)) as any;
		},
		[action, store],
	) as any;
}
