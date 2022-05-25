export enum StornMap {
	Auth = 'Auth',
	Counter = 'Counter',
	Users = 'Users',
}

type Record<Entity> = Entity & {
	get(): Entity;
	set(el: Entity): Entity;
};

type List<Entity> = Entity & {
	get(): Entity;
	set(el: Entity): Entity;
};

export interface Auth {
	accessToken: string;
	refreshToken: string;
}

export interface User {
	id: string;
	email: string;
}

export type Storn = Partial<{
	[StornMap.Auth]: Record<Auth>;
	[StornMap.Counter]: Record<number>;
	[StornMap.Users]: List<User>;
}>;
