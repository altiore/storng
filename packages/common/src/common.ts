export enum Method {
	GET = 'GET',
	POST = 'POST',
	PATCH = 'PATCH',
	PUT = 'PUT',
	DELETE = 'DELETE',
}

type Request<
	Req extends Record<string, string | never> = Record<string, never>,
> = {
	body: Partial<Req> | undefined;
	params: Partial<Req> | undefined;
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
	value: FormState[keyof FormState];
	property: string;
	children?: Array<ResError<FormState[keyof FormState]>>;
	constraints?: {[key in keyof FormState]: string};
};

export interface DataRes<
	Data extends Record<string, any> = Record<string, any>,
> {
	ok: boolean;
	data: Data;
}

export interface InfoRes {
	ok: boolean;
	message?: string;
}

export interface ErrorRes<
	FormState extends Record<string, any> = Record<string, any>,
> {
	ok: false;
	errors: Array<ResError<FormState>>;
}

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

		const queryParamArr = [];
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

		if (typeof data === 'object') {
			Object.keys(data).forEach((fieldName) => {
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
		const urlParams = [];
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

type ScopeConf<T extends Record<string, RouteConf>, NameType extends string> = {
	BASE: string;
	NAME: NameType;
	URL: T;
};

export class Scope<
	T extends Record<string, RouteConf>,
	NameType extends string,
> {
	constructor(conf: ScopeConf<T, NameType>) {
		this.BASE = conf.BASE;
		this.NAME = conf.NAME;

		Object.entries(conf.URL).forEach(([routeName, routeConf]) => {
			this[routeName] = new Route(routeConf, this.BASE);
		});
	}

	public readonly NAME: keyof T;
	public readonly BASE: string;

	toString(): keyof T {
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
	NameType extends string = string,
> = Scope<GetScopeConf<T>, NameType> & {[P in keyof T]: T[P]};

export function RouteScope<
	T extends Record<string, Route<any, any>>,
	NameType extends string = string,
>(conf: ScopeConf<GetScopeConf<T>, NameType>): GetScope<T> {
	return new Scope(conf) as GetScope<T>;
}

export class Paginated<T> {
	data: T[];
	count: number;
	total: number;
	page: number;
	pageCount: number;
}

export type RequestFunc<T extends Route<any, any>> = T extends Route<
	infer Req,
	infer Res
>
	? (data: Req) => Promise<Res>
	: unknown;
