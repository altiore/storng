import {Method, Route} from '@storng/common';
import {StoreRemote} from '@storng/store/src/store.remote';

import {mockSuccessItemFetch} from './storage/mock.fetch';

const remote = new StoreRemote(mockSuccessItemFetch);

const authData = {
	data: {
		accessToken: 'accessToken1',
	},
};

describe('StoreRemote src/store.remote.ts', () => {
	describe('fetch with NOT private route', () => {
		it('fetch with simplest route', async () => {
			const r = new Route({method: Method.GET, path: '/route'}, '/base');
			await remote.fetch(r, authData as any);

			expect(mockSuccessItemFetch).to.have.been.calledWith('/base/route', {
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
	});

	describe('fetch with private route', () => {
		it('fetch with simplest route', async () => {
			const r = new Route<{id: string}>(
				{method: Method.POST, path: '/route', private: true},
				'/base',
			);
			await remote.fetch(r, authData as any, {id: 'my-id'});

			expect(mockSuccessItemFetch).to.have.been.calledWith('/base/route', {
				body: JSON.stringify({id: 'my-id'}),
				cache: 'no-cache',
				credentials: 'same-origin',
				headers: {
					Accept: 'application/json',
					Authorization: 'bearer accessToken1',
					'Content-Type': 'application/json',
				},
				method: Method.POST,
				redirect: 'follow',
				referrerPolicy: 'no-referrer',
			});
		});
	});
});
