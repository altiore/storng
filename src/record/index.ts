import {RecordState} from '~/types';

export const record = <T extends Record<string, any>, Name extends string>(
	name: Name,
	initial: Partial<T> = {},
): RecordState<Name> => {
	let rec: Partial<T> = initial;

	const actions = {
		get: () => rec,
		set: (newRec: Partial<T>) => {
			rec = {...rec, newRec};
		},
	};
	const preparedActions: {[k: string]: any} & typeof actions = actions;

	Object.keys(preparedActions).forEach((key) => {
		const newKey = `${key}${name}`;
		preparedActions[newKey] = (actions as any)[key];
	});

	return actions as any;
};
