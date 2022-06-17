import {ResBase, Route} from '@storng/common';

import {FetchType} from './types';

export class StoreRemote {
	private readonly prefix: string;
	private readonly apiFetch: FetchType;

	constructor(apiFetch: FetchType, prefix = '') {
		this.apiFetch = apiFetch;
		this.prefix = prefix;
	}

	// private requestsQueue: Array<Route>;

	public async fetch(
		route: Route<any, any>,
		getAuth: () => Promise<
			| {accessToken: string; refreshToken}
			| null
			| undefined
			| Record<string, never>
		>,
		data?: Record<string, any>,
	): Promise<
		typeof Route extends Route<infer Req, infer Res>
			? ResBase<Res, Req>
			: ResBase
	> {
		try {
			let authData: any;
			if (route.private) {
				authData = await getAuth();
				if (!(authData as any)?.accessToken) {
					// TODO: logout
					return {
						message: 'Информация об авторизации была удалена',
						ok: false,
					};
				}
			}
			const [url, init] = route.fetchParams(data, this.prefix, {
				headers: route.private
					? {
							Authorization: `bearer ${authData?.accessToken}`,
					  }
					: {},
			});
			console.log('asdfasdf', {
				initHeaders: init.headers,
				url,
			});
			const res = await this.apiFetch(url, init);

			return await res.json();
		} catch (err) {
			return err;
		}
	}
}
