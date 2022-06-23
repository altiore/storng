import ReactDOM, {Container} from 'react-dom';

import {expect as chaiExpect} from 'chai';
import spies from 'chai-spies';
import * as Sinon from 'sinon';
import sinonChai from 'sinon-chai';

type RenderType = (
	element: any,
	container: Container | null,
	callback?: () => void,
) => Promise<{unmount: () => void}>;

type ActType = (cb: (render: RenderType) => void) => Promise<void>;
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
				await cb(
					(element, container) =>
						new Promise((resolve) => {
							ReactDOM.render(element, container, () => {
								resolve({
									unmount: () =>
										ReactDOM.unmountComponentAtNode(container as any),
								});
							});
						}),
				);
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
