import React, {useCallback} from 'react';

import {ActionFunc} from '@storng/common';
import {MaybeRemoteData} from '@storng/store';
import {StoreProvider, connect} from '@storng/store/react';

import {getStore} from './storage';
import {notify} from './storage/notify';
import {StoreType} from './storage/store.type';

const renderSpy = sinon.spy();

interface MyComponentProps {
	notify: MaybeRemoteData<StoreType['notify']>;
	send: ActionFunc<number>;
}

const MyComponent = React.memo(({notify, send}: MyComponentProps) => {
	const handleClick = useCallback(async () => {
		await send(3);
	}, [send]);

	renderSpy();
	return notify<JSX.Element>({
		correct: ({data}) => (
			<p onClick={handleClick}>correct: {data.messages.length}</p>
		),
		failure: ({error}) => <p onClick={handleClick}>{error.message}</p>,
		loading: <p onClick={handleClick}>...loading</p>,
		nothing: <p onClick={handleClick}>noting</p>,
	});
});

const STORE_NAME = 'sync.obj.with.custom.handler.test.tsx2';

const store = getStore(STORE_NAME);

const s = {
	notify: notify.item,
};

const a = {
	send: notify.send,
};

const Wrapped = connect(MyComponent, s, a);

describe('sync.obj.ts сущность без API', () => {
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

	it('подписка на изменения syncObject custom handler', async () => {
		await act(async (render) => {
			await render(
				<StoreProvider store={store}>
					<Wrapped />
				</StoreProvider>,
				root,
			);
			expect(root?.innerHTML).to.equal('<p>...loading</p>');
		});

		await wait(0.3);
		expect(root?.innerHTML).to.equal('<p>correct: 0</p>');

		expect(renderSpy).to.have.been.calledTwice;
	});

	it('меняем данные', async () => {
		await act(() => {
			const p = document.getElementsByTagName('p');
			p[0].click();
		});

		await wait(0.3);
		expect(root?.innerHTML).to.equal('<p>correct: 3</p>');

		expect(renderSpy).to.have.been.calledThrice;
	});
});
