import {ResBase, Route} from '@storng/common';

import {getFingerprint} from './fingerprint';
import {AuthData, FetchType} from './types';
import {getIsExpiredSoon} from './utils';

export class StoreRemote {
	private readonly prefix: string;
	private readonly apiFetch: FetchType;
	private readonly updateTokenRoute?: Route;
	private readonly logout: () => Promise<void>;
	private readonly getAuthToken: () => Promise<string | false>;
	private readonly updateAuthData?: (authData: AuthData) => Promise<void>;
	private readonly withFingerprint?: boolean;

	constructor(
		apiFetch: FetchType,
		prefix = '',
		getAuthToken: () => Promise<string | false>,
		logout: () => Promise<void>,
		updateAuthData?: (authData: AuthData) => Promise<void>,
		updateTokenRoute?: Route,
		withFingerprint?: boolean,
	) {
		this.apiFetch = apiFetch;
		this.prefix = prefix;
		this.getAuthToken = getAuthToken;
		this.updateAuthData = updateAuthData;
		this.updateTokenRoute = updateTokenRoute;
		this.logout = logout;
		this.withFingerprint = withFingerprint;
	}

	private isUpdating = false;

	private requestsQueue: Array<{
		route: Route;
		data?: Record<string, any>;
		cb: (res?: any) => void;
	}> = [];

	public async fetch(
		route: Route<any, any>,
		data?: Record<string, any>,
	): Promise<
		typeof Route extends Route<infer Req, infer Res>
			? ResBase<Res, Req>
			: ResBase
	> {
		try {
			if (route.private) {
				const accessToken = await this.getAuthToken();
				if (!this.updateTokenRoute) {
					throw new Error(
						'Вы пытаетесь использовать маршрут, который требует авторизацию, но' +
							' ваше хранилище не содержит updateTokenRoute для обновления ключа accessToken',
					);
				}
				if (!accessToken) {
					// TODO: logout
					// в этом месте нет необходимости производить выход, т.к. если данных нет в accessToken,
					// это означает, что выход уже произведен. Ведь критерием того, что пользователь находится
					// внутри системы как раз и является наличие ключа accessToken
					return {
						errors: [],
						message: 'Пользователь не авторизован (нет ключа доступа)',
						ok: false,
					};
				}

				if (this.isUpdating) {
					return await new Promise((resolve) => {
						this.requestsQueue.push({
							cb: resolve,
							data,
							route,
						});
					});
				}

				// 1. произвести проверку срока давности ключа
				const isExpiredSoon = getIsExpiredSoon(accessToken, 30);

				// 2. если ключ истекает в ближайшие x секунд или уже истек, то
				if (isExpiredSoon) {
					this.isUpdating = true;
					return await new Promise(async (resolve) => {
						try {
							// 2.1. отложить выполнения запроса в очередь
							this.requestsQueue.push({
								cb: resolve,
								data,
								route,
							});

							// 2.2. выполнить обновление ключа
							// TODO: это проблема, которую нужно вынести для решения в отдельное место
							const updateTokenResult = await this.makeRequest(
								this.updateTokenRoute as Route,
								this.withFingerprint
									? {
											fingerprint: await getFingerprint(),
									  }
									: undefined,
							);

							if (updateTokenResult.ok && this.updateAuthData) {
								await this.updateAuthData(updateTokenResult.data);
								this.isUpdating = false;
							} else {
								while (this.requestsQueue.length) {
									const cur = this.requestsQueue.shift();
									if (cur) {
										cur.cb({
											message:
												'Пользователь не авторизован (не удалось обновить ключ доступа)',
											ok: false,
										});
									}
								}
								this.isUpdating = false;
								return;
							}

							// 2.3. выполнить запросы из очереди с новым ключом
							while (this.requestsQueue.length) {
								const cur = this.requestsQueue.shift();
								if (cur) {
									this.makeRequest(cur.route, cur.data)
										.then(cur.cb)
										.catch(console.error);
								}
							}
						} catch (err: any) {
							if (err.ok === false) {
								resolve(err);
							}
							resolve({
								errors: [],
								message: String(err),
								ok: false,
							});
						}
					});
				}
			}

			return await this.makeRequest(route, data);
		} catch (err: any) {
			if (err?.ok !== false) {
				return {
					errors: [],
					message: String(err),
					ok: false,
				};
			}
			return err as ResBase;
		}
	}

	private makeRequest = async (
		route: Route<any, any>,
		data?: Record<string, any>,
	) => {
		try {
			const requestInit: Partial<RequestInit> = {};
			if (route.private) {
				const accessToken = await this.getAuthToken();
				if (accessToken) {
					requestInit.headers = {Authorization: `bearer ${accessToken}`};
				}
			}

			if (route.reqType === 'form-data') {
				requestInit.headers = {
					...(requestInit.headers || {}),
					'Content-Type': 'multipart/form-data',
				};
			}

			const [url, init] = route.fetchParams(data, this.prefix, requestInit);
			const res = await this.apiFetch(url, init);

			if (res.status === 401) {
				await this.logout();
			}

			const resJsonOrBlob =
				route.resType === 'blob' ? await res.blob() : await res.json();
			if (route.resType === 'blob' || typeof resJsonOrBlob.ok === 'boolean') {
				return resJsonOrBlob;
			} else {
				if (res.status < 400) {
					return {ok: true, ...resJsonOrBlob};
				} else {
					return {ok: false, ...resJsonOrBlob};
				}
			}
		} catch (err: any) {
			if (err?.ok !== false) {
				return {
					message: String(err),
					ok: false,
				};
			}
			return err as ResBase;
		}
	};
}
