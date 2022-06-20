import React from 'react';

import {MaybeRemoteData} from '@storng/store';
import {connect} from '@storng/store/src/react/index';

import {getStore} from './storage';
import {auth as getAuth} from './storage/auth';
import {StoreType} from './storage/store.type';

const renderSpy = sinon.spy();

interface MyComponentProps {
	auth: MaybeRemoteData<StoreType['auth_public']>;
}

const MyComponent = ({auth}: MyComponentProps) => {
	renderSpy();
	return auth<JSX.Element>({
		correct: ({data}) => <p>correct: {data.accessToken}</p>,
		failure: ({error}) => <p>{error.message}</p>,
		loading: () => <p>...loading</p>,
		nothing: () => <p>noting</p>,
	});
};

const STORE_NAME = 'sync.obj.restore-with-is-loading-false.tsx';

const auth = getAuth(STORE_NAME);

const store = getStore(STORE_NAME);

const Wrapped = connect(MyComponent, {
	auth,
});

describe('sync.obj.ts Подписка на данные из syncObj - как функции', () => {
	let root: any;

	before(async () => {
		await store.remove(STORE_NAME);
		root = getRoot();
	});

	after(() => {
		const el = document.getElementById('root');
		if (el) {
			el.remove();
		}
	});

	it('Добавляем mock данные для проверки перед тестом', async () => {
		await act(async () => {
			await store.local.putItem('auth_public', {
				data: {
					accessToken: 'my-id',
				},
				loadingStatus: {
					error: {message: 'message', ok: false},
					isLoaded: true,
					isLoading: true,
				},
			} as any);
		});

		expect(root?.innerHTML).to.equal('');
	}).timeout(5000);

	it('Проверить мок данные перед тестом', async () => {
		const item = await store.local.getItem('auth_public');

		expect(item).to.eql({
			data: {
				accessToken: 'my-id',
			},
			loadingStatus: {
				error: {message: 'message', ok: false},
				isLoaded: true,
				isLoading: true,
			},
		});
	}).timeout(5000);

	it('Восстанавливаем данные, в которых должно быть isLoading = false, error = undefined', async () => {
		await act(async (render) => {
			await render(<Wrapped />, root);
		});

		await wait(0.3);
		expect(root?.innerHTML).to.equal('<p>correct: my-id</p>');
	}).timeout(5000);

	it('Восстановление данных не изменило эти данные', async () => {
		const item = await store.local.getItem('auth_public');

		expect(item).to.eql({
			data: {
				accessToken: 'my-id',
			},
			loadingStatus: {
				error: {message: 'message', ok: false},
				isLoaded: true,
				isLoading: true,
			},
		});
	}).timeout(5000);
});
