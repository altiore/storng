import React from 'react';

import {MaybeRemoteData} from '@storng/store';
import {connect} from '@storng/store/src/react';

import {getStore} from './storage';
import {auth as getAuth} from './storage/auth';
import {StoreType} from './storage/store.type';

const renderSpy = sinon.spy();
const correctRenderSpy = sinon.spy();
const nothingRenderSpy = sinon.spy();

const Correct = ({data}: {data?: StoreType['auth_public']}) => {
	correctRenderSpy();
	return <div>correct: {data?.accessToken}</div>;
};

const Failure = ({data}: {data?: StoreType['auth_public']}) => {
	return <div>correct: {data?.accessToken}</div>;
};

const Nothing = () => {
	nothingRenderSpy();
	return <div>nothing</div>;
};

interface MyComponentProps {
	auth: MaybeRemoteData<StoreType['auth_public']>;
}

const MyComponent = ({auth}: MyComponentProps) => {
	renderSpy();
	return auth<JSX.Element>({
		correct: Correct,
		failure: Failure,
		loading: <div>loading: </div>,
		nothing: Nothing,
	});
};

const STORE_NAME = 'sync.obj.react-component.is-loading-status.test.tsx';

const auth = getAuth(STORE_NAME);

const store = getStore(STORE_NAME);

const Wrapped = connect(MyComponent, {
	auth,
});

describe(
	'sync.obj.ts Подписка на данные из syncObj - Как реакт компоненты с проверкой свойств' +
		' - проверяем isLoading статус',
	() => {
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

		it('считаем количество рендеров', async () => {
			await act(async (render) => {
				await render(<Wrapped />, root);
			});

			expect(root?.innerHTML).to.equal('<div>loading: </div>');

			await act(async () => {
				await auth.registerConfirm({
					accessToken: 'accessToken',
				});
			});

			await wait(0.3);

			expect(renderSpy).have.been.callCount(3);
			expect(nothingRenderSpy).have.been.calledOnce;
			expect(correctRenderSpy).have.been.calledOnce;
		}).timeout(5000);

		it('считаем количество рендеров, когда изначальные данные в состоянии correct', async () => {
			await act(async () => {
				await auth.registerConfirm({
					accessToken: 'accessToken',
				});
			});

			await wait(0.3);

			expect(renderSpy).have.been.callCount(5);
			expect(nothingRenderSpy).have.been.calledOnce;
			expect(correctRenderSpy).have.been.calledTwice;
		}).timeout(5000);
	},
);
