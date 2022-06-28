import React from 'react';

import {MaybeRemoteData} from '@storng/store';
import {StoreProvider, connect} from '@storng/store/react';

import {getStore} from './storage';
import {auth} from './storage/auth';
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

const store = getStore(STORE_NAME);

const Wrapped = connect(MyComponent, {
	auth,
});

describe('sync.obj.ts Подписка на данные из syncObj - Как реакт компоненты с проверкой свойств', () => {
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

	it('подписка на изменения syncObject', async () => {
		await act((render) => {
			render(
				<StoreProvider store={store}>
					<Wrapped />
				</StoreProvider>,
				root,
			);
		});

		expect(root?.innerHTML).to.equal('<div>loading: </div>');

		await wait(0.3);
		expect(renderSpy).to.have.been.calledThrice;
		expect(root?.innerHTML).to.equal('<div>nothing</div>');
	});
});
