import React from 'react';

import {loadedObject} from '~/loaded.object';
import {connect} from '~/react/connect';

const getItem = chai.spy();
const setItem = chai.spy();

const persistStore: any = {
	getItem,
	setItem,
};

type StoreType = {
	auth: {id?: string; token?: string};
};

const MyComponent = ({auth}) => {
	console.log('MyComponent auth is', auth);

	if (!auth) {
		return null;
	}
	return <div>MyComponent {auth.token}</div>;
};

describe('loaded.object.ts', () => {
	let root: any;
	beforeEach(() => {
		root = getRoot();
	});

	afterEach(() => {
		const el = document.getElementById('root');
		el.remove();
	});

	const {selector: auth} = loadedObject<StoreType>(
		'auth',
		{token: 'token'},
		persistStore,
		{},
	);

	const Wrapped = connect(MyComponent, {
		auth,
	} as any);

	it('subscribe loadedObject', async () => {
		await act((render) => {
			render(<Wrapped />, root);
		});

		expect(root?.innerHTML).to.equal('<div>MyComponent token</div>');
	});
});
