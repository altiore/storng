import React from 'react';

import {MaybeRemoteData} from '@storng/store';
import {connect} from '@storng/store/src/react/index';

import {getStore} from './storage';
import {notify as getNotify} from './storage/notify';
import {StoreType} from './storage/store.type';

const renderSpy = sinon.spy();

interface MyComponentProps {
	notify: MaybeRemoteData<StoreType['notify']>;
}

const MyComponent = ({notify}: MyComponentProps) => {
	renderSpy();
	return notify<JSX.Element>({
		correct: ({data}) => <p>correct: {data.messages.length}</p>,
		failure: ({error}) => <p>{error.message}</p>,
		loading: () => <p>...loading</p>,
		nothing: () => <p>noting</p>,
	});
};

const STORE_NAME = 'sync.obj.with.custom.handler.test.tsx';

const notify = getNotify(STORE_NAME);

const store = getStore(STORE_NAME);

const Wrapped = connect(MyComponent, {
	notify,
});

describe('sync.obj.ts Подписка на данные из syncObj - как функции', () => {
	let root: any;

	before(async () => {
		await store.remove(STORE_NAME);
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
			render(<Wrapped />, root);
		});

		expect(root?.innerHTML).to.equal('<p>...loading</p>');

		await wait(0.3);
		expect(renderSpy).to.have.been.calledTwice;
		expect(root?.innerHTML).to.equal('<p>correct: 0</p>');
	}).timeout(5000);

	it('меняем данные', async () => {
		await act(async () => {
			await notify.send(3);
		});

		await wait(0.3);

		expect(root?.innerHTML).to.equal('<p>correct: 3</p>');
	}).timeout(5000);
});
