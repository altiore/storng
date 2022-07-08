export enum Method {
	GET = 'GET',
	POST = 'POST',
	PATCH = 'PATCH',
	PUT = 'PUT',
	DELETE = 'DELETE',
}

type Request<
	Req extends Record<string, string | never> = Record<string, never>,
> = Req extends Record<string, never>
	? {
			body: undefined;
			params: undefined;
			method: Method;
			url: string;
	  }
	: Req['method'] extends Method.GET
	? {
			body: undefined;
			params: Partial<Req>;
			method: Method;
			url: string;
	  }
	: {
			body: Partial<Req>;
			params: undefined;
			method: Method;
			url: string;
	  };

export interface RouteConf<
	Req extends Record<string, any> = Record<string, never>,
> {
	method: Method;
	path?: string;
	private?: true;
	requiredParams?: Array<keyof Req>;
}

export type ResError<
	FormState extends Record<string, any> = Record<string, any>,
> = {
	children?: Array<ResError<FormState[keyof FormState]>>;
	constraints?: {[key in keyof FormState]: string};
	property: string;
	value: FormState[keyof FormState];
};

export interface DataRes<
	Data extends Record<string, any> = Record<string, any>,
> {
	data: Data;
	message?: string;
	ok: boolean;
}

export interface InfoRes {
	message?: string;
	ok: boolean;
}

export interface ErrorRes<
	FormState extends Record<string, any> = Record<string, any>,
> {
	errors: Array<ResError<FormState>>;
	message?: string;
	ok: false;
}

export type ErrorOrInfo<
	FormState extends Record<string, any> = Record<string, any>,
> = InfoRes | ErrorRes<FormState>;

export type ResBase<
	Data extends Record<string, any> = Record<string, any>,
	FormState extends Record<string, any> = Record<string, any>,
> = DataRes<Data> | InfoRes | ErrorRes<FormState>;

export class Route<
	Req extends Record<string, any> = Record<string, never>,
	Res extends ResBase = ResBase,
> {
	constructor(conf: RouteConf, basePath: string) {
		this.base = basePath;
		this.method = conf.method;
		this.relative = conf.path ?? '';
		this.private = conf.private;
		this.path = this.base + this.relative;
		this.urlRequiredParams = this.path.match(/:[a-zA-Z]+/g) || [];
		this.requiredParams = conf.requiredParams || [];
	}

	public readonly method: Method;
	public readonly private?: boolean;
	private readonly base: string;
	private readonly relative: string;
	private readonly path: string;
	private readonly requiredParams: Array<keyof Req> = [];
	private readonly urlRequiredParams: string[] = [];

	toString(): string {
		return this.path;
	}

	get name(): string {
		return `${this.method}:${this.path}`;
	}

	/**
	 * Возвращает полный маршрут (url), заменяя параметры на значения из объекта params
	 */
	public to(params?: Partial<Req>): string {
		const [url, urlParams] = this.replaceUrlParams(this.path, params);

		const queryParamArr: string[] = [];
		if (params) {
			Object.entries(params).forEach(([paramName, paramValue]) => {
				if (!urlParams.includes(paramName)) {
					queryParamArr.push(`${paramName}=${paramValue}`);
				}
			});
		}

		return queryParamArr.length ? `${url}?${queryParamArr.join('&')}` : url;
	}

	request(data?: Req): Request<Req> {
		const [url, urlParams] = this.replaceUrlParams(this.path, data);
		this.checkRequiredParams(this.requiredParams, data);
		const preparedData =
			typeof data === 'object' ? Object.assign({}, data) : undefined;

		if (preparedData) {
			Object.keys(preparedData).forEach((fieldName) => {
				if (urlParams.includes(fieldName)) {
					delete preparedData[fieldName];
				}
			});
		}

		const isGet = this.method === Method.GET;

		const req = {
			method: this.method,
			url,
		} as Request<Req>;
		if (preparedData) {
			if (isGet) {
				req.params = preparedData;
			} else {
				req.body = preparedData;
			}
		}
		return req;
	}

	fetchParams(
		data?: Req,
		prefix = '',
		requestInit?: Partial<RequestInit>,
	): [string, RequestInit] {
		const request = this.request(data);

		return [
			prefix + (request.method === Method.GET ? this.to(data) : request.url),
			{
				body: request.body ? JSON.stringify(request.body) : undefined,
				cache: 'no-cache',
				credentials: 'same-origin',
				method: request.method,
				redirect: 'follow',
				referrerPolicy: 'no-referrer',
				...(requestInit || {}),
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
					...(requestInit?.headers || {}),
				},
			},
		];
	}

	response(
		ok: boolean,
		payload?: string | Record<string, any> | Array<ResError>,
	): Res {
		if (!payload) {
			return {ok} as Res;
		}
		if (typeof payload === 'string') {
			return {
				message: payload,
				ok,
			} as Res;
		}
		if (Array.isArray(payload)) {
			return {
				errors: payload,
				ok,
			} as Res;
		}
		return {
			data: payload,
			ok,
		} as Res;
	}

	private replaceUrlParams(
		path: string,
		params?: Partial<Req>,
	): [string, string[]] {
		let preparedPath = path;
		const urlParams: string[] = [];
		this.urlRequiredParams.forEach((paramWithTwoDots) => {
			const paramName = paramWithTwoDots.replace(':', '');

			if (typeof params?.[paramName] === 'undefined') {
				throw new Error(
					`Базовый параметр маршрута "${this.path}" "${paramName}" - обязателен!`,
				);
			}

			urlParams.push(paramName);
			preparedPath = preparedPath.replace(
				`:${paramName}`,
				String(params[paramName]),
			);
		});

		return [preparedPath, urlParams];
	}

	private checkRequiredParams(
		requiredParams: Array<keyof Req> = [],
		params?: Partial<Req>,
	) {
		requiredParams.forEach((paramName) => {
			if (typeof params?.[paramName] === 'undefined') {
				throw new Error(
					`Параметр маршрута "${this.path}" "${paramName}" - обязателен!`,
				);
			}
		});
	}
}

type ScopeConf<
	T extends Record<string, RouteConf>,
	NameType extends string | number | symbol,
> = {
	BASE: string;
	NAME: NameType;
	URL: T;
};

export class Scope<
	T extends Record<string, RouteConf>,
	NameType extends string | number | symbol,
> {
	constructor(conf: ScopeConf<T, NameType>) {
		this.BASE = conf.BASE;
		this.NAME = conf.NAME;

		Object.entries(conf.URL).forEach(([routeName, routeConf]) => {
			this.routes.push(routeName);
			this[routeName] = new Route(routeConf, this.BASE);
		});
	}

	public readonly NAME: NameType;
	public readonly BASE: string;
	public readonly routes: string[] = [];

	toString(): NameType {
		return this.NAME;
	}
}

export type GetScopeConf<T extends Record<string, Route>> = {
	[P in keyof T]: T[P] extends Route<infer Req, any>
		? RouteConf<Req>
		: RouteConf<any>;
};
export type GetScope<
	T extends Record<string, Route<any, any>>,
	NameType extends string | number | symbol = string,
> = Scope<GetScopeConf<T>, NameType> & {[P in keyof T]: T[P]};

export function RouteScope<
	T extends Record<string, Route<any, any>>,
	NameType extends string | number | symbol = string,
>(conf: ScopeConf<GetScopeConf<T>, NameType>): GetScope<T, NameType> {
	return new Scope(conf) as GetScope<T, NameType>;
}

export interface Paginated<T> {
	data: T[];
	count: number;
	total: number;
	page: number;
	pageCount: number;
}

export type ActionFunc<T extends any = any> = T extends Route<
	infer Req,
	infer Res
>
	? (data: Req) => Promise<Res>
	: T extends undefined
	? () => Promise<void>
	: (data: T) => Promise<void>;

export type GetActionFunc<T extends any = any> = (
	store: any,
	prepareDataForSubscriber: any,
) => ActionFunc<T>;

export type RouteReq<T extends Route<any, any>> = T extends Route<
	infer Req,
	any
>
	? Req
	: unknown;

export type RouteRes<T extends Route<any, any>> = T extends Route<
	any,
	infer Res
>
	? Promise<Res>
	: unknown;

export enum CrudUrl {
	createMany = 'createMany',
	createOne = 'createOne',
	deleteMany = 'deleteMany',
	deleteOne = 'deleteOne',
	getMany = 'getMany',
	getOne = 'getOne',
	recoverMany = 'recoverMany',
	recoverOne = 'recoverOne',
	replaceMany = 'replaceMany',
	replaceOne = 'replaceOne',
	updateMany = 'updateMany',
	updateOne = 'updateOne',
}
