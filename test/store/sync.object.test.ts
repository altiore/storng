import {DataRes, Method, Route, RouteScope} from '@storng/common';
import {PersistStore, syncObject} from '@storng/store';

const weakStore = {
	subscribe: chai.spy(),
	updateData: chai.spy(),
} as any;

const apiStore = {
	fetch: chai.spy(() => ({data: {email: 'my-email', id: 'my-id'}, ok: true})),
} as any;

type AuthRoutes = {
	register: Route<
		{email: string; password: string},
		DataRes<{id: string; email: string}>
	>;
};

const authScope = RouteScope<AuthRoutes>({
	BASE: '/auth',
	NAME: 'Авторизация',
	URL: {
		register: {
			method: Method.POST,
			path: '/sign-up',
			requiredParams: ['email', 'password'],
		},
	},
});

const getItem = chai.spy();
const setItem = chai.spy();
const persistStore: PersistStore<any> = {
	getItem: getItem as any,
	setItem: setItem as any,
};

const registerSpy = {
	request: chai.spy(syncObject.nothing.request),
	success: chai.spy(syncObject.nothing.success),
	// eslint-disable-next-line sort-keys
	failure: chai.spy(syncObject.nothing.failure),
};

const auth = syncObject<string, {id: string; email: string}, AuthRoutes>(
	weakStore,
	apiStore,
	'auth',
	{},
	authScope,
	{
		register: registerSpy,
	},
	persistStore,
);

describe('sync.object.ts', () => {
	describe('select', () => {
		it('select - это функция', () => {
			expect(typeof auth.select).to.be.eq('function');
		});

		it('select - можем подписаться на изменения хранилища', () => {
			const subscriber = chai.spy();
			auth.select(subscriber);
			expect(weakStore.subscribe).to.have.been.called.with(
				'auth',
				subscriber,
				{
					data: {},
					isLoaded: false,
					isLoading: false,
				},
				persistStore,
			);
		});
	});

	describe('проверяем экшен register', () => {
		it('register - это функция', () => {
			expect(typeof auth.register).to.be.eq('function');
		});

		it('register - вызывает обращение к api', async () => {
			const data = {email: 'test@mail.com', password: '123123'};
			await auth.register(data);
			expect(weakStore.updateData).to.have.been.called.twice;
			expect(apiStore.fetch).to.have.been.called.with(authScope.register, data);
		});
	});
});
