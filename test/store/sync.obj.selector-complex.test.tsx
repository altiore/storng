import React from 'react';

import {ActionFunc} from '@storng/common';
import {StoreProvider, connect} from '@storng/store/react';

import {getStore} from './storage';
import {mockVersionFetch} from './storage/mock.fetch';
import {PublicUrls, apiVersion, publicData} from './storage/public';

const renderSpy = sinon.spy();

interface MyComponentProps {
	apiVersion: string;
	fetchVersions: ActionFunc<PublicUrls['fetchVersion']>;
}

const MyComponent = ({apiVersion}: MyComponentProps) => {
	renderSpy();
	return <p>{apiVersion}</p>;
};

const STORE_NAME = 'sync.obj.selector-complex.test.tsx';

const store = getStore(STORE_NAME, mockVersionFetch);

const Wrapped = connect(
	MyComponent,
	{
		apiVersion,
	},
	{
		fetchVersions: publicData.fetchVersion,
	},
);

describe(
	'sync.obj.selector-complex.test.tsx Подписка на данные из syncObj. Второй селектор, зависящий' +
		' от тех же данных',
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

		it('подписка на изменения syncObject с использованием селекторов начальные данные', async () => {
			await act(async (render) => {
				await render(
					<StoreProvider store={store}>
						<Wrapped />
					</StoreProvider>,
					root,
				);
			});

			expect(root?.innerHTML).to.equal('<p>X.X.X</p>');
		});

		it(
			'подписка на изменения syncObject с использованием селекторов. Данные из данных' +
				' по-умолчанию',
			async () => {
				await wait(0.3);
				expect(renderSpy).to.have.been.callCount(2);

				expect(root?.innerHTML).to.equal('<p>default</p>');
			},
		);
	},
);
