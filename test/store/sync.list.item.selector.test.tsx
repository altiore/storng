import React, {useCallback, useState} from 'react';

import {ActionFunc} from '@storng/common';
import {MaybeRemoteData} from '@storng/store';
import {connect} from '@storng/store/src/react';
import {StoreProvider} from '@storng/store/src/react/store.provider';

import {getStore} from './storage';
import {API_USERS} from './storage/_users';
import {mockSuccessListFetch} from './storage/mock.fetch';
import {StoreType} from './storage/store.type';
import {users} from './storage/users';

const renderSpy = sinon.spy();

const STORE_NAME = 'sync.list.item.selector.test.tsx';

const store = getStore(STORE_NAME, mockSuccessListFetch);

interface MyComponentProps {
	getOne: ActionFunc<typeof API_USERS.getOne>;
	user: (id: string) => MaybeRemoteData<StoreType['users']>;
}

const MyComponent = ({getOne, user}: MyComponentProps) => {
	const [id, setId] = useState('user-id-0');
	const fetchOne = useCallback(() => {
		getOne({id}).then().catch(console.error);
	}, [getOne, id]);

	const changeId = useCallback(() => {
		setId('unknown-id');
	}, [setId]);

	renderSpy();

	return (
		<p onClick={fetchOne}>
			<span onClick={changeId}>
				{user(id)({
					correct: ({data}) => data.email,
					failure: ({error}) => {
						console.log('error is', JSON.stringify(error));
						return 'failure';
					},
					loading: 'loading',
					nothing: 'nothing',
				})}
			</span>
		</p>
	);
};

const s = {
	user: users.oneById,
};

const a = {
	getOne: users.getOne,
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

		expect(root?.innerHTML).to.equal('<p><span>loading</span></p>');

		expect(renderSpy).have.been.callCount(1);
	});

	it('вторая генерация', async () => {
		await wait(0.3);

		expect(renderSpy).have.been.callCount(2);

		expect(root?.innerHTML).to.equal('<p><span>nothing</span></p>');
	});

	it('загрузить данные для одного элемента', async () => {
		await act(() => {
			const p = document.getElementsByTagName('p');
			p[0].click();
		});

		await wait(0.3);

		expect(root?.innerHTML).to.equal('<p><span>user-0@mail.com</span></p>');
	});

	it('Изменить фильтр (установить несуществующий id)', async () => {
		await act(() => {
			const p = document.getElementsByTagName('span');
			p[0].click();
		});

		await wait(0.3);

		expect(root?.innerHTML).to.equal('<p><span>nothing</span></p>');
	});
});
