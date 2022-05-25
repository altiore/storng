import {StornMap} from '~/@storn/@types';

import {record} from '../../';
import api from '../api/api1';

const routes: any = {
	get: {
		method: 'GET',
		url: '/auth',
	},
	update: {
		method: 'PATCH',
		url: '/auth',
	},
};

export const auth = record(
	StornMap.Auth,
	api(routes, {
		get: record.replace,
		update: record.update,
	}),
);
