import React, {useEffect, useState} from 'react';

import {record} from '~/record';

const btnId = 'myButton';
const LikeButton = () => {
	const [text, setText] = useState('OldState');

	useEffect(() => {
		setText('NewState');
	}, []);

	return <button id={btnId}>{text}</button>;
};

describe('createRecord', () => {
	it('test react', async () => {
		const root = getRoot();

		let btn: HTMLButtonElement | undefined;
		await act((render) => {
			render(<LikeButton />, root);
			btn = document.querySelector(`#${btnId}`);
			expect(btn?.innerHTML).to.equal('OldState');
		});

		expect(btn?.id).to.equal(btnId);
		expect(btn?.innerHTML).to.equal('NewState');
	});

	it('test without', () => {
		const rec = record('User');
		expect(typeof rec.setUser).to.equal('function');
		expect(typeof rec.getUser).to.equal('function');
	});
});
