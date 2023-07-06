import React, {useCallback, useState} from 'react';

import {MaybeRemoteData} from '@storng/store';
import {useAction, useSelector} from '@storng/store/src/react';
import {StoreProvider} from '@storng/store/src/react/store.provider';

import {getStore} from './storage';
import {API_USERS} from './storage/_users';
import {mockSuccessListFetch} from './storage/mock.fetch';
import {StoreType} from './storage/store.type';
import {users} from './storage/users';

const renderSpy = sinon.spy();

const STORE_NAME = 'sync.list.item.use-selector.test.tsx';

const store = getStore(STORE_NAME, mockSuccessListFetch);

const MyComponent = () => {
	const [id, setId] = useState('user-id-0');
	const getOne = useAction<typeof API_USERS.getOne>(users.getOne);
	const user = useSelector<(id: string) => MaybeRemoteData<StoreType['users']>>(
		users.oneById,
	);
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

describe(`${STORE_NAME} проверяем селектор одного элемента из списка`, () => {
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

	it(`первая генерация компонента - ${STORE_NAME}`, async () => {
		await act(async (render) => {
			await render(
				<StoreProvider store={store}>
					<MyComponent />
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
