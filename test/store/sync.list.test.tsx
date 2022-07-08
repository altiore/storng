import React, {useEffect} from 'react';

import {MaybeRemoteData} from '@storng/store';
import {connect} from '@storng/store/src/react';
import {StoreProvider} from '@storng/store/src/react/store.provider';

import {getStore} from './storage';
import {mockSuccessListFetch} from './storage/mock.fetch';
import {StoreType} from './storage/store.type';
import {users} from './storage/users';

const renderSpy = sinon.spy();

const STORE_NAME = 'sync.list.test.tsx';

const store = getStore(STORE_NAME, mockSuccessListFetch);

interface MyComponentProps {
	users: MaybeRemoteData<Array<StoreType['users']>>;
	fetchUsers: any;
}

const MyComponent = ({fetchUsers, users}: MyComponentProps) => {
	useEffect(() => {
		if (fetchUsers) {
			fetchUsers().then().catch(console.error);
		}
	}, [fetchUsers]);

	renderSpy();

	return users<JSX.Element>({
		correct: ({data}) => {
			return <p>correct {data?.length}</p>;
		},
		failure: ({error}) => {
			console.error('error', JSON.stringify(error));
			return <p>failure {error.message}</p>;
		},
		loading: <p>loading {typeof fetchUsers}</p>,
		nothing: <p>nothing {typeof fetchUsers}</p>,
	});
};

const s = {
	users,
};

const a = {
	fetchUsers: users.fetch,
};

const Wrapped = connect(MyComponent, s, a);

describe('sync.list.ts', () => {
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
		expect(typeof users).to.be.eq('function');
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

		expect(renderSpy).have.been.callCount(1);
	});

	it('вторая генерация', async () => {
		await wait(0.3);

		expect(root?.innerHTML).to.equal('<p>correct 2</p>');

		expect(renderSpy).have.been.callCount(2);
	});
});
