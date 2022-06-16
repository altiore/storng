import ReactDOM from 'react-dom';

import {expect as chaiExpect} from 'chai';
import spies from 'chai-spies';
import * as Sinon from 'sinon';
import sinonChai from 'sinon-chai';

type ActType = (cb: (render: typeof ReactDOM.render) => void) => Promise<void>;
type WaitType = (seconds: number) => Promise<void>;

declare global {
	export const expect: typeof chaiExpect;
	export const act: ActType;
	export const getRoot: () => HTMLDivElement;
	export const wait: WaitType;
	export const sinon: typeof Sinon;
}

const act: ActType = (cb) =>
	new Promise((resolve, reject) => {
		setTimeout(async () => {
			try {
				await cb(ReactDOM.render);
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

const wait = (seconds: number) =>
	new Promise((resolve) => setTimeout(resolve, seconds * 1000));

chai.use(spies);
chai.use(sinonChai);

(global as any).act = act;
(global as any).getRoot = getRoot;
(global as any).wait = wait;
(global as any).sinon = Sinon;
