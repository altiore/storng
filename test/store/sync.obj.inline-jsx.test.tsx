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
		correct: <p>correct</p>,
		failure: <p>failure</p>,
		loading: <p>loading</p>,
		nothing: <p>nothing</p>,
	});
};

const STORE_NAME = 'sync.obj.inline-jsx.test.tsx';

const auth = getAuth(STORE_NAME);

const store = getStore(STORE_NAME);

const Wrapped = connect(MyComponent, {
	auth,
});

describe('sync.obj.ts Подписка на данные из syncObj - просто JSX разметка без функции', () => {
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

	it('подписка на изменения syncObject', async () => {
		await act((render) => {
			render(<Wrapped />, root);
		});

		expect(root?.innerHTML).to.equal('<p>loading</p>');

		await wait(0.3);
		expect(renderSpy).to.have.been.calledTwice;
		expect(root?.innerHTML).to.equal('<p>nothing</p>');
	}).timeout(5000);

	it('добавляем данные', async () => {
		const registerConfirmPromise = auth.registerConfirm({
			accessToken: 'accessToken',
		});

		expect(root?.innerHTML).to.equal('<p>loading</p>');

		await act(async () => {
			await registerConfirmPromise;
		});

		await wait(0.3);

		expect(root?.innerHTML).to.equal('<p>correct</p>');
	}).timeout(5000);
});
