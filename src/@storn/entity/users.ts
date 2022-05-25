import {StornMap} from '~/@storn/@types';

import {list} from '../../';
import api from '../api/api1';

const routes = {
	deleteOne: {
		method: 'DELETE',
		url: '/users/:id',
	},
	getMany: {
		method: 'GET',
		url: '/users',
	},
	getOne: {
		method: 'GET',
		url: '/users/:id',
	},
	ultraCustomMethod: {
		method: 'DELETE',
		url: '/users/:id',
	},
};

export default list(
	StornMap.Auth,
	api(routes, {
		ultraCustomMethod: list.update,
	}),
);
