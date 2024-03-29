import React, {useCallback} from 'react';

import {ActionFunc, FilterBy} from '@storng/common';
import {MaybeRemoteListData} from '@storng/store';
import {connect} from '@storng/store/src/react';
import {StoreProvider} from '@storng/store/src/react/store.provider';

import {getStore} from './storage';
import {mockSuccessListFetch} from './storage/mock.fetch';
import {StoreType} from './storage/store.type';
import {users} from './storage/users';

const renderSpy = sinon.spy();

const STORE_NAME = 'sync.list.selector-order.test.tsx';

const store = getStore(STORE_NAME, mockSuccessListFetch);

interface MyComponentProps {
	changeFilter: ActionFunc<FilterBy>;
	users: MaybeRemoteListData<StoreType['users']>;
}

const MyComponent = ({changeFilter, users}: MyComponentProps) => {
	const handleChangeFilter = useCallback(() => {
		changeFilter({
			paginate: {
				limit: 2,
				page: 2,
			},
		})
			.then()
			.catch(console.error);
	}, [changeFilter]);

	renderSpy();

	return users<JSX.Element>({
		correct: ({data, paginate}) => {
			return (
				<p onClick={handleChangeFilter}>
					correct {data[0].order} - {paginate.limit}
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

const a = {
	changeFilter: users.onChangeFilter,
};

const Wrapped = connect(MyComponent, s, a);

describe('sync.list.selector.test.tsx', () => {
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

	it('users.currentPage is function', () => {
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

		expect(renderSpy).have.been.callCount(1);
	});

	it('вторая генерация', async () => {
		await wait(0.3);

		expect(renderSpy).have.been.callCount(2);

		expect(root?.innerHTML).to.equal('<p>correct 2 - 10</p>');
	});
});
