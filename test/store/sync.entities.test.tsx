import React, {useEffect} from 'react';

import {ActionFunc} from '@storng/common';
import {connect} from '@storng/store/src/react';
import {StoreProvider} from '@storng/store/src/react/store.provider';

import {getStore} from './storage';
import {API_USERS} from './storage/_users';
import {mockSuccessListFetch} from './storage/mock.fetch';
import {users} from './storage/users';

const renderSpy = sinon.spy();

const STORE_NAME = 'sync.entities.test.tsx';

const store = getStore(STORE_NAME, mockSuccessListFetch);

interface MyComponentProps {
	fetchUsers: ActionFunc<typeof API_USERS.getMany>;
}

const MyComponent = ({fetchUsers}: MyComponentProps) => {
	useEffect(() => {
		if (fetchUsers) {
			fetchUsers().then().catch(console.error);
		}
	}, [fetchUsers]);

	renderSpy();

	return <p>одинаковый</p>;
};

const a = {
	fetchUsers: users.getMany,
};

const Wrapped = connect(MyComponent, undefined, a);

describe('sync.entities.tsx', () => {
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

	it('users.getSubscriber is func', () => {
		expect(typeof users.currentPage).to.be.eq('object');
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

		expect(root?.innerHTML).to.equal('<p>одинаковый</p>');

		expect(renderSpy).have.been.callCount(1);
	});

	it('После загрузки данных, данные должны быть доступны в хранилище', async () => {
		let list = await store.local.getList('users');
		while (list.loadingStatus.isLoading) {
			await wait(0.3);
			list = await store.local.getList('users');
		}
		expect(list.loadingStatus.isLoading).to.be.eql(false);
		expect(list.data.length).to.be.eq(2);

		expect(renderSpy).have.been.callCount(1);
	});

	it('Выход из системы должен удалить данные', async () => {
		await act(async () => {
			await store.logout();
		});
		const list = await store.local.getList('users');
		expect(list.loadingStatus.isLoading).to.be.eql(true);
		expect(list.data.length).to.be.eq(0);

		expect(renderSpy).have.been.callCount(1);
	});
});
