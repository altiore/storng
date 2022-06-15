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
		data?: Record<string, any>,
	): Promise<
		typeof Route extends Route<infer Req, infer Res>
			? ResBase<Res, Req>
			: ResBase
	> {
		try {
			const res = await this.apiFetch(...route.fetchParams(data, this.prefix));
			return await res.json();
		} catch (err) {
			return err;
		}
	}
}
