import {Method, ResBase, Route, RouteScope} from '@storng/common';

import {StoreType} from './store.type';

export enum AuthType {
	EMAIL = 'email',
	PHONE = 'phone',
}

export interface IRegister {
	authType: AuthType;
	authId: string;
	authSecret: string;
}

export interface IRegisterConfirm {
	authId: string;
	confirmCode: string;
}

export interface IAuth {
	accessToken: string;
	refreshToken: string;
}

export type AuthUrls = {
	register: Route<IRegister, ResBase<Record<string, never>, IRegister>>;
	registerConfirm: Route<IRegisterConfirm, ResBase<IAuth, IRegisterConfirm>>;
};

export const API_AUTH = RouteScope<AuthUrls, keyof StoreType>({
	BASE: '/auth',
	NAME: 'auth_public',
	URL: {
		register: {method: Method.POST, path: '/register'},
		registerConfirm: {method: Method.PATCH, path: '/register-confirm'},
	},
});
