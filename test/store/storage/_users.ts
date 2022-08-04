import {CrudUrl, Method, ResBase, Route, RouteScope} from '@storng/common';

export interface IUser {
	id: string;
}

export type UsersUrls = {
	customRoute: Route<
		Record<string, never>,
		ResBase<Record<string, never>, {data: Array<IUser>}>
	>;
	[CrudUrl.getMany]: Route<
		Record<string, never>,
		ResBase<Record<string, never>, {data: Array<IUser>}>
	>;
	[CrudUrl.getOne]: Route<
		{id: string},
		ResBase<Record<string, never>, {data: IUser}>
	>;
};

export const API_USERS = RouteScope<UsersUrls, 'users'>({
	BASE: '/base',
	NAME: 'users',
	URL: {
		customRoute: {method: Method.GET, path: '/users/custom'},
		[CrudUrl.getMany]: {method: Method.GET, path: '/users'},
		[CrudUrl.getOne]: {method: Method.GET, path: '/users/:id'},
	},
});
