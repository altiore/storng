import {WeakStore} from '@storng/store';

const subscriber1 = chai.spy();
const subscriber2 = chai.spy();

const getItem = chai.spy();
const setItem = chai.spy();

const persistStore: any = {
	getItem,
	setItem,
};

type StoreType = {
	user: {email: string; id: string};
};

const NAME = 'test-store';

describe('store.ts', () => {
	describe('subscribe', () => {
		WeakStore.NAME = 'TEST_STORAGE';
		const store = WeakStore.getStore<StoreType>();

		store.subscribe(
			'user',
			subscriber1,
			{
				email: 'email@email.com',
				id: 'user-id',
			},
			persistStore,
		);

		it('persistStore.getItem called on first subscribe', () => {
			expect(getItem).on.nth(1).be.called.with('user');
		});

		it('subscriber1 called on first subscribe', () => {
			expect(subscriber1).on.nth(1).be.called.with({
				email: 'email@email.com',
				id: 'user-id',
			});
		});

		it('persistStore.getItem NOT called on second subscribe', () => {
			store.subscribe('user', subscriber2, undefined, persistStore);
			expect(getItem).be.called.exactly(1);
		});

		it('subscriber2 called on second subscribe', () => {
			expect(subscriber2).to.have.been.called.with({
				email: 'email@email.com',
				id: 'user-id',
			});
		});

		it('persistStore.updateData trigger subscriber1 with new data', () => {
			store.updateData(
				'user',
				{
					email: 'new@mail,.com',
				},
				false,
				persistStore,
			);
			expect(subscriber1).on.nth(2).be.called.with({
				email: 'new@mail,.com',
				id: 'user-id',
			});
		});

		it('persistStore.updateData trigger subscriber2 with new data', () => {
			expect(subscriber2).on.nth(2).be.called.with({
				email: 'new@mail,.com',
				id: 'user-id',
			});
		});

		it('persistStore.unsubscribe trigger removing subscriber1, subscriber2', async () => {
			await store.unsubscribe('user', subscriber1, persistStore);
			await store.unsubscribe('user', subscriber2, persistStore);
			expect(setItem).to.have.been.called.with('user', {
				email: 'new@mail,.com',
				id: 'user-id',
			});
			expect(setItem).to.have.been.called.once;
			// ключ остается, но данные недоступны
			expect(store.hasStructure('user')).to.be.true;
			expect(store.hasData('user')).to.be.false;
		});

		it('persistStore.updateData with empty subscribers trigger setItem', async () => {
			await store.updateData(
				'user',
				{
					email: 'finish@mail.com',
				},
				false,
				persistStore,
			);
			expect(setItem).to.have.been.called.twice;
			// ключ остается, но данные недоступны
			expect(store.hasStructure('user')).to.be.true;
			expect(store.hasData('user')).to.be.false;
		});

		it('то же хранилище используется, если запрашиваем его второй раз', () => {
			const store2 = WeakStore.getStore<StoreType>(NAME);

			expect(store === store2).to.be.true;
		});
	});
});
