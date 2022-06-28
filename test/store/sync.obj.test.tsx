import React, {useCallback} from 'react';

import {MaybeRemoteData} from '@storng/store';
import {connect} from '@storng/store/src/react';
import {StoreProvider} from '@storng/store/src/react/store.provider';

import {getStore} from './storage';
import {auth} from './storage/auth';
import {StoreType} from './storage/store.type';

const renderSpy = sinon.spy();

const STORE_NAME = 'sync.obj.test.tsx';

const store = getStore(STORE_NAME);

interface MyComponentProps {
	auth: MaybeRemoteData<StoreType['auth_public']>;
	registerConfirm: any;
}

const MyComponent = ({auth, registerConfirm}: MyComponentProps) => {
	const onClick = useCallback(async () => {
		await registerConfirm({
			accessToken: 'accessToken',
		});
	}, [registerConfirm]);

	renderSpy();

	return auth<JSX.Element>({
		correct: <p onClick={onClick}>correct {typeof registerConfirm}</p>,
		failure: <p onClick={onClick}>failure {typeof registerConfirm}</p>,
		loading: <p onClick={onClick}>loading {typeof registerConfirm}</p>,
		nothing: <p onClick={onClick}>nothing {typeof registerConfirm}</p>,
	});
};

const s = {
	auth,
};

const a = {
	registerConfirm: auth.registerConfirm,
};

const Wrapped = connect(MyComponent, s, a);

describe('sync.object.ts', () => {
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

	it('auth is func', () => {
		expect(typeof auth).to.be.eq('function');
	});

	it('первая генерация компонента', async () => {
		await act(async (render) => {
			await render(
				<StoreProvider store={store}>
					<Wrapped />
				</StoreProvider>,
				root,
			);
		});

		expect(root?.innerHTML).to.equal('<p>loading function</p>');

		expect(renderSpy).have.been.callCount(2);
	});

	it('вторая генерация', async () => {
		await wait(0.3);

		expect(root?.innerHTML).to.equal('<p>nothing function</p>');

		expect(renderSpy).have.been.callCount(3);
	});

	it('обновляем данные', async () => {
		await act(() => {
			const p = document.getElementsByTagName('p');
			p[0].click();
		});

		expect(root?.innerHTML).to.equal('<p>loading function</p>');

		await wait(0.3);

		expect(root?.innerHTML).to.equal('<p>correct function</p>');

		expect(renderSpy).have.been.callCount(5);
	});
});
