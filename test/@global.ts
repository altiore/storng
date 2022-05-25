import ReactDOM from 'react-dom';

import {expect as chaiExpect} from 'chai';

type ActType = (cb: (render: typeof ReactDOM.render) => void) => Promise<void>;

declare global {
	export const expect: typeof chaiExpect;
	export const act: ActType;
	export const getRoot: () => HTMLDivElement;
}

const act: ActType = (cb) =>
	new Promise((resolve, reject) => {
		setTimeout(() => {
			try {
				cb(ReactDOM.render);
				setTimeout(resolve, 0);
			} catch (e) {
				reject(e);
			}
		}, 0);
	});

const getRoot = (): HTMLDivElement => {
	const id = 'root';
	const root = document.querySelector(`#${id}`);
	if (root) {
		root.innerHTML = '';
		return root as HTMLDivElement;
	}

	const div = document.createElement('div');
	div.id = id;
	document.body.appendChild(div);
	return div;
};

(global as any).act = act;
(global as any).getRoot = getRoot;
