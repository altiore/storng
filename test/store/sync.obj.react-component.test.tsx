import React from 'react';

import {MaybeRemoteData} from '@storng/store';
import {connect} from '@storng/store/src/react/index';

import {store} from './storage';
import {auth as getAuth} from './storage/auth';
import {StoreType} from './storage/store.type';

const renderSpy = sinon.spy();

const Correct = ({data}: {data?: StoreType['auth_public']}) => {
	return <div>correct: {data?.accessToken}</div>;
};

const Failure = ({data}: {data?: StoreType['auth_public']}) => {
	return <div>correct: {data?.accessToken}</div>;
};

const Loading = ({data}: {data?: StoreType['auth_public']}) => {
	return <div>loading: {data?.accessToken}</div>;
};

const Nothing = () => {
	return <div>nothing</div>;
};

interface MyComponentProps {
	auth: MaybeRemoteData<StoreType['auth_public']>;
}

const MyComponent = ({auth}: MyComponentProps) => {
	renderSpy();
	return auth<JSX.Element>({
		correct: Correct,
		failure: Failure,
		loading: Loading,
		nothing: Nothing,
	});
};

const STORE_NAME = 'sync.obj.react-component.test.tsx';

const auth = getAuth(STORE_NAME);

const Wrapped = connect(MyComponent, {
	auth,
});

describe('sync.obj.ts Подписка на данные из syncObj - Как реакт компоненты с проверкой свойств', () => {
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

		expect(root?.innerHTML).to.equal('<div>loading: </div>');

		await wait(0.3);
		expect(renderSpy).to.have.been.calledTwice;
		expect(root?.innerHTML).to.equal('<div>nothing</div>');
	}).timeout(5000);

	it('добавляем данные', async () => {
		const registerConfirmPromise = auth.registerConfirm({
			authId: 'id',
			confirmCode: '123123',
		});

		expect(root?.innerHTML).to.equal('<div>loading: </div>');

		await act(async () => {
			await registerConfirmPromise;
		});

		await wait(0.3);

		expect(root?.innerHTML).to.equal('<div>correct: accessToken</div>');
	}).timeout(5000);
});
