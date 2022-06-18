import {SyncObjectType} from '@storng/store';

import {syncObject} from './index';
import {StoreType} from './store.type';

type Actions = 'deepMerge' | 'clear';

export const notify = (
	name: string,
): SyncObjectType<Record<string, never>, StoreType['notify'], Actions> =>
	syncObject<'notify', Record<string, never>, Actions>(
		name,
		'notify',
		{
			clear: syncObject.remove,
			deepMerge: syncObject.deepMerge,
		},
		{messages: [], open: false},
	);

export const a = async (): Promise<void> => {
	await notify('').clear();
	await notify('').deepMerge({messages: []});
};
