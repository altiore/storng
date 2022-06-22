import React from 'react';

import {MaybeRemoteData} from '@storng/store';
import {connect} from '@storng/store/src/react';

import {getStore} from './storage';
import {auth as getAuth} from './storage/auth';
import {StoreType} from './storage/store.type';

const renderSpy = sinon.spy();
const correctRenderSpy = sinon.spy();
const nothingRenderSpy = sinon.spy();

const STORE_NAME =
	'sync.obj.react-component.is-loading-status.nested-subscribers.test.tsx';

const auth = getAuth(STORE_NAME);

const store = getStore(STORE_NAME);

const NestedCorrect = connect(
	(({auth}: any) => {
		return auth({
			correct: <p>correct</p>,
			failure: <p>failure</p>,
			loading: <p>loading</p>,
			nothing: <p>nothing</p>,
		} as any);
	}) as any,
	{auth},
);

const Correct = () => {
	correctRenderSpy();
	return (
		<div>
			<NestedCorrect />
		</div>
	);
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
		loading: Correct,
		nothing: Nothing,
	});
};

const Wrapped = connect(MyComponent, {
	auth,
});

describe(
	'sync.obj.ts Подписка на данные из syncObj - Как реакт компоненты с проверкой свойств' +
		' - проверяем isLoading статус с вложенными подписчиками',
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

			expect(root?.innerHTML).to.equal('<div><p>loading</p></div>');

			// expect(loadingRenderSpy).have.been.calledOnce;

			await act(async () => {
				await auth.registerConfirm({
					accessToken: 'accessToken',
				});
			});

			await wait(0.3);

			expect(root?.innerHTML).to.equal('<div><p>correct</p></div>');

			// expect(loadingRenderSpy).have.been.calledOnce;
			expect(renderSpy).have.been.callCount(3);
			// expect(nothingRenderSpy).have.been.calledOnce;
			// expect(correctRenderSpy).have.been.calledOnce;
		}).timeout(5000);

		// it('считаем количество рендеров, когда изначальные данные в состоянии correct', async () => {
		// 	await act(async () => {
		// 		await auth.registerConfirm({
		// 			accessToken: 'accessToken',
		// 		});
		// 	});
		//
		// 	await wait(0.3);
		//
		// 	// expect(loadingRenderSpy).have.been.calledTwice;
		// 	expect(renderSpy).have.been.callCount(5);
		// 	expect(nothingRenderSpy).have.been.calledOnce;
		// 	expect(correctRenderSpy).have.been.calledTwice;
		// }).timeout(5000);
	},
);
