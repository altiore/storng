import {Method, Route} from '@storng/common';

export class ApiStore<T extends Record<string, T[keyof T]>> {
	public apiFetch: typeof fetch;
	constructor(apiFetch: typeof fetch) {
		this.apiFetch = apiFetch;
	}

	// private requestsQueue: Array<Route>;

	public async fetch(route: Route, data?: Record<string, any>): Promise<any> {
		try {
			const request = route.request(data as any);
			const res = await this.apiFetch(
				request.method === Method.GET ? route.to(data as any) : request.url,
				{
					body: JSON.stringify(request.body),
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
