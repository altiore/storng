import React from 'react';

import {ActionFunc} from '@storng/common';
import {MaybeRemoteData} from '@storng/store';
import {StoreProvider, connect} from '@storng/store/react';

import {getStore} from './storage';
import {mockVersionFetch} from './storage/mock.fetch';
import {PublicUrls, publicData} from './storage/public';
import {StoreType} from './storage/store.type';

const renderSpy = sinon.spy();

interface MyComponentProps {
	publicData: MaybeRemoteData<StoreType['public_common']>;
	fetchVersions: ActionFunc<PublicUrls['fetchVersion']>;
}

const MyComponent = ({publicData, fetchVersions}: MyComponentProps) => {
	renderSpy();
	return publicData<JSX.Element>({
		correct: ({data}) => <p>correct: {data?.api?.api}</p>,
		failure: ({error}) => <p>{error.message}</p>,
		loading: () => <p>...loading</p>,
		nothing: () => <p>nothing {typeof fetchVersions}</p>,
	});
};

const STORE_NAME = 'sync.obj.selector.test.tsx';

const store = getStore(STORE_NAME, mockVersionFetch);

const Wrapped = connect(
	MyComponent,
	{
		publicData: publicData.item,
	},
	{
		fetchVersions: publicData.fetchVersion,
	},
);

describe('sync.obj.selector.test.tsx Подписка на данные из syncObj. Простой селектор', () => {
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

	it('подписка на изменения syncObject с использованием селекторов начальные данные', async () => {
		await act(async (render) => {
			await render(
				<StoreProvider store={store}>
					<Wrapped />
				</StoreProvider>,
				root,
			);
		});

		expect(root?.innerHTML).to.equal('<p>...loading</p>');
	});

	it(
		'подписка на изменения syncObject с использованием селекторов. Данные из данных' +
			' по-умолчанию',
		async () => {
			await wait(0.3);
			expect(renderSpy).to.have.been.callCount(2);

			expect(root?.innerHTML).to.equal('<p>correct: default</p>');
		},
	);
});
