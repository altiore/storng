import {Method, ResBase, Route} from '@storng/common';

export class StoreRemote {
	private readonly prefix: string;
	private readonly apiFetch: (
		url: string,
		init: RequestInit,
	) => Promise<Response>;
	constructor(
		apiFetch: (url: string, init: RequestInit) => Promise<Response>,
		prefix = '',
	) {
		this.apiFetch = apiFetch;
		this.prefix = prefix;
	}

	// private requestsQueue: Array<Route>;

	public async fetch(
		route: Route<any>,
		data?: Record<string, any>,
	): Promise<ResBase> {
		try {
			const request = route.request(data);
			const res = await this.apiFetch(
				this.prefix +
					(request.method === Method.GET ? route.to(data) : request.url),
				{
					body: request.body ? JSON.stringify(request.body) : undefined,
					cache: 'no-cache',
					credentials: 'same-origin',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
					},
					method: request.method,
					redirect: 'follow',
					referrerPolicy: 'no-referrer',
				},
			);
			return await res.json();
		} catch (err) {
			return err;
		}
	}
}
