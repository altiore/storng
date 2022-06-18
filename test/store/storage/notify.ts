import {SyncObjectType} from '@storng/store';

import {syncObject} from './index';
import {StoreType} from './store.type';

type Actions = 'deepMerge' | 'clear' | 'shift';

export const notify = (
	name: string,
): SyncObjectType<Record<string, never>, StoreType['notify'], Actions> =>
	syncObject<'notify', Record<string, never>, Actions>(
		name,
		'notify',
		{
			clear: syncObject.remove,
			deepMerge: syncObject.deepMerge,
			shift: syncObject.custom<StoreType['notify'], {test: string}>(
				(state, data) => ({
					messages: state.messages.slice(0, state.messages.length - 1),
					open: state.open && Boolean(data.test),
				}),
			),
		},
		{messages: [], open: false},
	);

export const a = async (): Promise<void> => {
	await notify('').clear();
	await notify('').deepMerge({messages: []});
};
