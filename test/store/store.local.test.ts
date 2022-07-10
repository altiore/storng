import {StoreLocal} from '@storng/store/src/store.local';

const DB_NAME = 'strong';

type StoreStructure = {
	auth: {
		key: 'id';
		value: Partial<{accessKey: string; refreshKey: string}>;
	};
	profile: {
		key: 'id';
		value: Partial<{image: string}>;
	};
	users: {
		key: string;
		value: {
			id: string;
			email: string;
		};
	};
};

const store = new StoreLocal<StoreStructure>(DB_NAME, 1, {
	auth: 'id',
	profile: 'id',
	users: 'id',
});

describe('Постоянное хранилище src/store.persist.ts', () => {
	before(async () => {
		await store.deleteStorage();
	});

	it('проверяем конфиг', () => {
		// @ts-ignore
		const conf = store.getConfig();
		expect(conf.name).to.be.eq(DB_NAME);
		expect(conf.version).to.be.eq(1);
		expect(conf.entityKeyNames).to.be.eql({
			auth: 'id',
			profile: 'id',
			users: 'id',
		});
	});

	describe('кладем ОБЪЕКТ данных в хранилище и извлекаем из него', () => {
		it('кладем данные в хранилище', async () => {
			const res = await store.putItem('auth', {
				accessKey: 'accessKey',
				refreshKey: 'refreshKey',
			});
			expect(res).to.be.eql('auth');
		});

		it('извлекаем данные из хранилища', async () => {
			const res = await store.getItem('auth');
			expect(res).to.be.eql({
				accessKey: 'accessKey',
				refreshKey: 'refreshKey',
			});
		});

		it('повторное извлечение данных из хранилища (не изменило ли их предыдущее извлечение)', async () => {
			const res = await store.getItem('auth');
			expect(res).to.be.eql({
				accessKey: 'accessKey',
				refreshKey: 'refreshKey',
			});
		});

		it('добавляем данные в хранилище', async () => {
			const res = await store.addItem('profile', {image: 'my-image'});
			expect(res).to.be.eql('profile');
		});

		it('проверяем добавленные данные', async () => {
			const res = await store.getItem('profile');
			expect(res).to.be.eql({image: 'my-image'});
		});

		it('повторно проверяем добавленные данные (не изменило ли их предыдущее извлечение)', async () => {
			const res = await store.getItem('profile');
			expect(res).to.be.eql({image: 'my-image'});
		});

		it('удаляем auth ОБЪЕКТ элемент из хранилища', async () => {
			await store.delItem('auth');
			expect(await store.getItem('auth')).to.be.undefined;
		});

		it('удаляем profile ОБЪЕКТ элемент из хранилища', async () => {
			await store.delItem('profile');
			expect(await store.getItem('profile')).to.be.undefined;
		});
	});

	describe('кладем МАССИВ данных в хранилище и извлекаем из него', () => {
		it('добавляем пользователя', async () => {
			const res = await store.addItem('users', {
				email: 'test@mail.com',
				id: '1',
			});
			expect(res).to.be.eq('1');
		});

		it('находим добавленного пользователя', async () => {
			const res = await store.getItem('users', '1');
			expect(res).to.be.eql({
				email: 'test@mail.com',
				id: '1',
			});
		});

		it('кладем второго пользователя', async () => {
			const res = await store.addItem('users', {
				email: 'test2@mail.com',
				id: '2',
			});
			expect(res).to.be.eq('2');
		});

		it('получаем массив пользователей', async () => {
			const users = await store.getList('users');
			expect(users).to.be.eql({
				data: [
					{
						email: 'test@mail.com',
						id: '1',
					},
					{
						email: 'test2@mail.com',
						id: '2',
					},
				],
				filter: {},
				loadingStatus: {
					error: undefined,
					isLoaded: true,
					isLoading: true,
					updatedAt: 0,
				},
				paginate: {
					count: 0,
					page: 1,
					pageCount: 0,
					total: 0,
				},
			});
		});

		it('получаем обоих добавленных пользователей', async () => {
			const user1 = await store.getItem('users', '1');
			const user2 = await store.getItem('users', '2');
			expect(user1).to.be.eql({
				email: 'test@mail.com',
				id: '1',
			});
			expect(user2).to.be.eql({
				email: 'test2@mail.com',
				id: '2',
			});
		});
	});
});
