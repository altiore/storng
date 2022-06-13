import React, {useState} from 'react';

import {PersistStore, syncObjectSimple} from '@storng/store';
import {connect} from '@storng/store/react';

const getItem = chai.spy();
const setItem = chai.spy();

const persistStore: PersistStore<any> = {
	getItem: getItem as any,
	setItem: setItem as any,
};

type StoreType = {
	auth: {id?: string; token?: string};
};

const {select: auth, update: updateAuth} = syncObjectSimple<StoreType>(
	'auth',
	{id: 'old-id', token: '123123'},
	persistStore,
	{},
);

const MyComponent = ({auth}) => {
	if (!auth) {
		return null;
	}
	return (
		<div>
			token: "{auth.token}"; id: "{auth.id}"
		</div>
	);
};

const Wrapped = connect(MyComponent, {
	auth: auth as any,
});

const Parent = (): JSX.Element => {
	const [isShown, setIsShown] = useState(true);
	const handleClick = () => {
		setIsShown(false);
	};

	if (isShown) {
		return (
			<div onClick={handleClick} id="parent">
				<Wrapped />
			</div>
		);
	} else {
		return null;
	}
};

describe('sync.object.simple.ts', () => {
	let root: any;
	beforeEach(() => {
		root = getRoot();
	});

	afterEach(() => {
		const el = document.getElementById('root');
		if (el) {
			el.remove();
		}
	});

	it('подписка на изменения syncObject', async () => {
		await act((render) => {
			updateAuth(() => ({id: 'old-id', token: '123123'}));
			render(<Parent />, root);
		});

		expect(root?.innerHTML).to.equal(
			'<div id="parent"><div>token: "123123"; id: "old-id"</div></div>',
		);
	});

	it('подписка syncObject и обновление данных', async () => {
		await act(async (render) => {
			render(<Parent />, root);
			await updateAuth((s) => ({...s, token: '000000'}));
		});

		expect(root?.innerHTML).to.equal(
			'<div id="parent"><div>token: "000000"; id: "old-id"</div></div>',
		);
	});

	it('подписка syncObject и замена данных', async () => {
		await act(async (render) => {
			render(<Parent />, root);
			await updateAuth(() => ({token: '777'}));
		});

		expect(root?.innerHTML).to.equal(
			'<div id="parent"><div>token: "777"; id: ""</div></div>',
		);
	});

	it('подписка и отписка syncObject от данных в момент unmount', async () => {
		const obj: any = <Parent />;
		await act(async (render) => {
			render(obj, root);
		});

		await act(() => {
			const parent = document.getElementById('parent');
			parent.click();
		});

		expect(root?.innerHTML).to.equal('');
	});

	it('отображение двух разных компонентов, подписанных на одни и те же данные', async () => {
		await act(async (render) => {
			render(
				<div>
					<Parent />
					<Parent />
				</div>,
				root,
			);
		});

		expect(root?.innerHTML).to.equal(
			'<div><div id="parent"><div>token: "777"; id: ""</div></div><div id="parent"><div>token: "777"; id: ""</div></div></div>',
		);
	});
});
