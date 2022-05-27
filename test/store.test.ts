import {ObjRec} from '~/obj-rec';
import {WeakStore} from '~/store';

const subscribe = chai.spy();

const getItem = chai.spy();
const setItem = chai.spy();

const persistStore: any = {
	getItem,
	setItem,
};

describe('store.ts', () => {
	describe('subscribe', () => {
		const rec = new ObjRec<string, any>('users', {
			email: 'email@email.com',
			id: 'user-id',
		});
		const store = new WeakStore(persistStore);

		store.subscribe(rec, subscribe);

		it('persistStore.getItem called on first subscribe', () => {
			expect(getItem).to.have.been.called.with('users');
		});

		it('subscribe called on first subscribe', () => {
			expect(subscribe).to.have.been.called.with({
				email: 'email@email.com',
				id: 'user-id',
			});
		});
	});
});
