import {Method, Route, RouteScope, ResBase} from '@storng/common';

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

export const API_AUTH = RouteScope<AuthUrls>({
  BASE: '/auth',
  NAME: 'Authorization',
  URL: {
    register: {method: Method.POST, path: '/register'},
    registerConfirm: {method: Method.PATCH, path: '/register-confirm'},
  },
});
