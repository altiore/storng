export interface RecordActions {
	get: string;
	set: string;
}

export type RecordState<Name extends string> = Record<
	`${keyof RecordActions}${Name}`,
	string
>;
