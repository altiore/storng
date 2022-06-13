import {Method, Route} from '@storng/common';
import {StoreApi} from '@storng/store';

const fetch = chai.spy(
	() =>
		new Promise((resolve) => {
			return resolve({
				json: chai.spy(),
			});
		}),
) as any;

describe('store.api.ts', () => {
	describe('fetch', () => {
		const api = new StoreApi(fetch);

		it('простейший Get запрос', () => {
			const route = new Route(
				{
					method: Method.GET,
					path: '/test',
				},
				'/base',
			);
			api.fetch(route);
			expect(fetch).to.have.been.called.with('/base/test', {
				body: undefined,
				cache: 'no-cache',
				credentials: 'same-origin',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
				method: Method.GET,
				redirect: 'follow',
				referrerPolicy: 'no-referrer',
			});
		});

		it('Get с параметрами', () => {
			const route = new Route(
				{
					method: Method.GET,
					path: '/test/:id',
					requiredParams: ['page'],
				},
				'/base',
			);
			api.fetch(route, {id: 'test-id', page: 1});
			expect(fetch).to.have.been.called.with('/base/test/test-id?page=1', {
				body: undefined,
				cache: 'no-cache',
				credentials: 'same-origin',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
				method: Method.GET,
				redirect: 'follow',
				referrerPolicy: 'no-referrer',
			});
		});

		it('Post с body', () => {
			const route = new Route(
				{
					method: Method.POST,
					path: '/test/:id',
				},
				'/base',
			);
			api.fetch(route, {id: 'test-id', page: 1, tel: '+76767676'});
			expect(fetch).to.have.been.called.with('/base/test/test-id', {
				body: '{"page":1,"tel":"+76767676"}',
				cache: 'no-cache',
				credentials: 'same-origin',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
				method: Method.POST,
				redirect: 'follow',
				referrerPolicy: 'no-referrer',
			});
		});
	});
});
