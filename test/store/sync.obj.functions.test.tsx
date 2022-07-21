import React, {useCallback} from 'react';

import {ActionFunc} from '@storng/common';
import {MaybeRemoteData} from '@storng/store';
import {StoreProvider, connect} from '@storng/store/react';

import {getStore} from './storage';
import {AuthUrls} from './storage/_auth';
import {auth} from './storage/auth';
import {StoreType} from './storage/store.type';

const renderSpy = sinon.spy();

interface MyComponentProps {
	auth: MaybeRemoteData<StoreType['auth_public']>;
	registerConfirm: ActionFunc<AuthUrls['registerConfirm']>;
}

const MyComponent = ({auth, registerConfirm}: MyComponentProps) => {
	const handleClick = useCallback(async () => {
		await registerConfirm({
			accessToken: 'accessToken',
		});
	}, [registerConfirm]);
	renderSpy();
	return auth<JSX.Element>({
		correct: ({data}) => (
			<p onClick={handleClick}>correct: {data.accessToken}</p>
		),
		failure: ({error}) => <p onClick={handleClick}>{error.message}</p>,
		loading: () => <p onClick={handleClick}>...loading</p>,
		nothing: () => <p onClick={handleClick}>{typeof registerConfirm}</p>,
	});
};

const STORE_NAME = 'sync.obj.functions.test.tsx';

const store = getStore(STORE_NAME);

const Wrapped = connect(
	MyComponent,
	{
		auth,
	},
	{
		registerConfirm: auth.registerConfirm,
	},
);

describe('sync.obj.ts Подписка на данные из syncObj - как функции', () => {
	let root: any;

	before(async () => {
		await store.remove();
		root = getRoot();
	});

	after(() => {
		const el = document.getElementById('root');
		if (el) {
			el.remove();
		}
	});

	it('подписка на изменения syncObject functions', async () => {
		await act(async (render) => {
			await render(
				<StoreProvider store={store}>
					<Wrapped />
				</StoreProvider>,
				root,
			);
		});

		expect(root?.innerHTML).to.equal('<p>...loading</p>');

		await wait(0.3);
		expect(renderSpy).to.have.been.calledTwice;
		expect(root?.innerHTML).to.equal('<p>function</p>');
	});

	it('добавляем данные', async () => {
		await act(() => {
			const p = document.getElementsByTagName('p');
			p[0].click();
		});

		expect(root?.innerHTML).to.equal('<p>...loading</p>');

		await wait(0.3);

		expect(root?.innerHTML).to.equal('<p>correct: accessToken</p>');
	}).timeout(5000);
});
