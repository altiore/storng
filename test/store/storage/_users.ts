import {Method, ResBase, Route, RouteScope} from '@storng/common';

export interface IUser {
	id: string;
}

export type UsersUrls = {
	fetch: Route<
		Record<string, never>,
		ResBase<Record<string, never>, {data: Array<IUser>}>
	>;
};

export const API_USERS = RouteScope<UsersUrls, 'users'>({
	BASE: '/base',
	NAME: 'users',
	URL: {
		fetch: {method: Method.GET, path: '/users'},
	},
});
