import React, {useEffect} from 'react';

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
	fetchVersions: ActionFunc<PublicUrls['version']>;
}

const MyComponent = ({publicData, fetchVersions}: MyComponentProps) => {
	useEffect(() => {
		fetchVersions().then().catch(console.error);
	}, [fetchVersions]);

	renderSpy();
	return publicData<JSX.Element>({
		correct: ({data}) => <p>correct: {data.api.api}</p>,
		failure: ({error}) => <p>{error.message}</p>,
		loading: () => <p>...loading</p>,
		nothing: () => <p>{typeof fetchVersions}</p>,
	});
};

const STORE_NAME = 'sync.obj.nested-data-with-fetch.test.tsx';

const store = getStore(STORE_NAME, mockVersionFetch);

const Wrapped = connect(
	MyComponent,
	{
		publicData: publicData.item,
	},
	{
		fetchVersions: publicData.version,
	},
);

describe(
	'sync.obj.ts Подписка на данные из syncObj - вложенные данные результата с' +
		' предварительной загрузкой данных',
	() => {
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

		it('подписка на изменения syncObject nested with fetch', async () => {
			await act(async (render) => {
				await render(
					<StoreProvider store={store}>
						<Wrapped />
					</StoreProvider>,
					root,
				);
			});

			expect(root?.innerHTML).to.equal('<p>...loading</p>');

			await wait(1.3);
			expect(renderSpy).to.have.been.callCount(2);
			expect(root?.innerHTML).to.equal('<p>correct: 3.3.3</p>');
		});
	},
);
