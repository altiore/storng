import {SyncObjectType, syncObject} from '@storng/store';

import {StoreType} from './store.type';

type Actions = {
	clear: undefined;
	deepMerge: Partial<StoreType['notify']>;
	send: number;
};

export const notify: SyncObjectType<
	Record<string, never>,
	Actions
> = syncObject<StoreType, 'notify', Record<string, never>, Actions>(
	'notify',
	{
		clear: syncObject.remove,
		deepMerge: syncObject.deepMerge,
		send: syncObject.custom<StoreType['notify'], number>(
			(state, data): StoreType['notify'] => {
				return {
					messages: Array.from(Array(data).keys()),
					open: Boolean(state.open),
				};
			},
		),
	},
	{messages: [], open: false},
);

export const a = async (): Promise<void> => {
	await notify.clear('', '')();
	// await notify.deepMerge('', '')({messages: []});
};
