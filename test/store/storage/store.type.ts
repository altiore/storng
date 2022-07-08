export type StoreType = {
	auth_public: {accessToken: string};
	notify: {open: boolean; messages: Array<any>};
	public_common: {
		api: {
			api: string;
			contracts: string;
		};
	};
	users: {
		id: string;
		email: string;
	};
};
