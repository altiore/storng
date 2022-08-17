import React from 'react';

import {MaybeRemoteListData} from '@storng/store';
import {connect} from '@storng/store/src/react';
import {StoreProvider} from '@storng/store/src/react/store.provider';

import {getStore} from './storage';
import {mockEmptyListFetch} from './storage/mock.fetch';
import {StoreType} from './storage/store.type';
import {users} from './storage/users';

const renderSpy = sinon.spy();

const STORE_NAME = 'sync.list.selector.empty-data.test.tsx';

const store = getStore(STORE_NAME, mockEmptyListFetch);

interface MyComponentProps {
	users: MaybeRemoteListData<StoreType['users']>;
}

const MyComponent = ({users}: MyComponentProps) => {
	renderSpy();

	return users<JSX.Element>({
		correct: ({data, paginate}) => {
			return (
				<p>
					correct {data?.length} - {paginate.limit}
				</p>
			);
		},
		failure: ({error}) => {
			console.error('error', JSON.stringify(error));
			return <p>failure {error.message}</p>;
		},
		loading: <p>loading</p>,
		nothing: <p>nothing</p>,
	});
};

const s = {
	users: users.currentPage(),
};

const Wrapped = connect(MyComponent, s);

describe('sync.list.selector.empty-data.test.tsx', () => {
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

	it('users.currentPage is func', () => {
		expect(typeof users.currentPage).to.be.eq('function');
	});

	it('первая генерация компонента - sync.list.test', async () => {
		await act(async (render) => {
			await render(
				<StoreProvider store={store}>
					<Wrapped />
				</StoreProvider>,
				root,
			);
		});

		expect(root?.innerHTML).to.equal('<p>loading</p>');

		expect(mockEmptyListFetch).have.been.callCount(0);

		expect(renderSpy).have.been.callCount(1);
	});

	it('вторая генерация', async () => {
		await wait(0.3);

		expect(mockEmptyListFetch).have.been.callCount(1);

		expect(renderSpy).have.been.callCount(2);

		expect(root?.innerHTML).to.equal('<p>nothing</p>');
	});
});
