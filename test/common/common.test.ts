import {GetScope, Method, Route, RouteScope} from '@storng/common';

type AuthRoutes = {
	LOGIN: Route<{email: string; password: string}, {id: string; email: string}>;
	LOGOUT: Route;
};

const getScope = () =>
	RouteScope<AuthRoutes>({
		BASE: '/auth',
		NAME: 'Авторизация',
		URL: {
			LOGIN: {
				method: Method.PATCH,
				path: '/login',
				requiredParams: ['email', 'password'],
			},
			LOGOUT: {method: Method.POST, path: '/logout'},
		},
	});

describe('common.ts', () => {
	describe('Route', () => {
		const GET_KITCHEN = new Route<{id: string; page?: number; limit?: number}>(
			{
				method: Method.GET,
				path: '/:id',
			},
			'/v2/kitchens',
		);

		it('Route.toString()', () => {
			expect(GET_KITCHEN.toString()).to.eq('/v2/kitchens/:id');
		});

		it('Route.name', () => {
			expect(GET_KITCHEN.name).to.eq('GET:/v2/kitchens/:id');
		});

		it('Route.to throw', () => {
			expect(() => GET_KITCHEN.to()).to.throw();
		});

		it('Route.to', () => {
			expect(
				GET_KITCHEN.to({
					id: 'kitchen-id',
				}),
			).to.eq('/v2/kitchens/kitchen-id');
		});

		it('Route.to with optional params', () => {
			expect(
				GET_KITCHEN.to({
					id: 'kitchen-id',
					limit: 20,
					page: 2,
				}),
			).to.eq('/v2/kitchens/kitchen-id?limit=20&page=2');
		});

		it('Route.request to throw without route required param', () => {
			// @ts-expect-error
			expect(() => GET_KITCHEN.request({limit: 20, page: 2})).to.throw();
		});

		it('Route.request', () => {
			expect(
				GET_KITCHEN.request({
					id: 'kitchen-id',
					limit: 20,
					page: 2,
				}),
			).to.eql({
				method: Method.GET,
				params: {
					limit: 20,
					page: 2,
				},
				url: '/v2/kitchens/kitchen-id',
			});
		});

		it('Route.request throw when waiting required params', () => {
			const GET_KITCHENS = new Route<{page: number; limit: number}>(
				{
					method: Method.GET,
					requiredParams: ['page', 'limit'],
				},
				'/v2/kitchens',
			);

			expect(() => GET_KITCHENS.request()).to.throw();
		});

		it('Route.response', () => {
			const GET_KITCHENS = new Route<{page: number; limit: number}>(
				{
					method: Method.GET,
					requiredParams: ['page', 'limit'],
				},
				'/v2/kitchens',
			);

			expect(GET_KITCHENS.response()).to.eql({});
		});
	});

	describe('RouteScope', () => {
		const API_AUTH: GetScope<AuthRoutes> = getScope();

		it('RouteScope.name', () => {
			expect(API_AUTH.NAME).to.eq('Авторизация');
		});

		it('RouteScope.base', () => {
			expect(API_AUTH.BASE).to.eq('/auth');
		});

		it('RouteScope.toString', () => {
			expect(API_AUTH.toString()).to.eq('Авторизация');
		});

		it('RouteScope.URL.to', () => {
			expect(API_AUTH.LOGIN.to()).to.eq('/auth/login');
		});

		it('RouteScope.URL.request', () => {
			expect(API_AUTH.LOGOUT.request()).to.eql({
				method: Method.POST,
				url: '/auth/logout',
			});
		});

		it('RouteScope.URL.request with params', () => {
			expect(
				API_AUTH.LOGIN.request({
					email: 'test@mail.com',
					password: '123123123',
				}),
			).to.eql({
				body: {
					email: 'test@mail.com',
					password: '123123123',
				},
				method: Method.PATCH,
				url: '/auth/login',
			});
		});
	});
});
