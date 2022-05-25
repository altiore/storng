import {GetScope, Method, Route, RouteScope} from '~/common';

type AuthRoutes = {
	LOGIN: Route;
};

const getScope = () =>
	RouteScope<AuthRoutes>({
		BASE: '/auth',
		NAME: 'Авторизация',
		URL: {
			LOGIN: {method: Method.PATCH, path: '/login'},
		},
	});

describe('common.ts', () => {
	let API_AUTH: GetScope<AuthRoutes>;

	it('RouteScope.name', () => {
		API_AUTH = getScope();
		expect(API_AUTH.NAME).to.equal('Авторизация');
	});

	it('RouteScope.base', () => {
		API_AUTH = getScope();
		expect(API_AUTH.BASE).to.equal('/auth');
	});

	it('RouteScope.toString', () => {
		API_AUTH = getScope();
		expect(API_AUTH.toString()).to.equal('Авторизация');
	});

	it('RouteScope.LOGIN', () => {
		API_AUTH = getScope();
		expect(API_AUTH.LOGIN.to()).to.equal('/auth/login');
	});
});
