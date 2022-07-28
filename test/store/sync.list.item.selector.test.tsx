import React, {useCallback, useState} from 'react';

import {ActionFunc, Paginated} from '@storng/common';
import {MaybeRemoteData} from '@storng/store';
import {connect} from '@storng/store/src/react';
import {StoreProvider} from '@storng/store/src/react/store.provider';

import {getStore} from './storage';
import {mockSuccessListFetch} from './storage/mock.fetch';
import {StoreType} from './storage/store.type';
import {users} from './storage/users';

const renderSpy = sinon.spy();

const STORE_NAME = 'sync.list.item.selector.test.tsx';

const store = getStore(STORE_NAME, mockSuccessListFetch);

interface MyComponentProps {
	changeFilter: ActionFunc<Partial<Omit<Paginated<any>, 'data'>>>;
	user: (id: string) => MaybeRemoteData<StoreType['users']>;
}

const MyComponent = ({changeFilter, user}: MyComponentProps) => {
	const [id, setId] = useState('user-id-0');
	const changeId = useCallback(() => {
		setId('no-such-user-id');
	}, [changeFilter]);

	renderSpy();

	return (
		<p onClick={changeId}>
			{user(id)({
				correct: ({data}) => data.email,
				failure: 'failure',
				loading: 'loading',
				nothing: 'nothing',
			})}
		</p>
	);
};

const s = {
	user: users.oneById,
};

const a = {
	changeFilter: users.onChangeFilter,
};

const Wrapped = connect(MyComponent, s, a);

describe('sync.list.item.selector.test.tsx проверяем селектор одного элемента из списка', () => {
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

	it('первая генерация компонента - sync.list.item.selector.test.tsx', async () => {
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

		expect(root?.innerHTML).to.equal('<p>user-0@mail.com</p>');
	});

	it('Изменить фильтр (элемент с несуществующим id)', async () => {
		await act(() => {
			const p = document.getElementsByTagName('p');
			p[0].click();
		});

		await wait(0.1);

		expect(root?.innerHTML).to.equal('<p>nothing</p>');
	});
});
