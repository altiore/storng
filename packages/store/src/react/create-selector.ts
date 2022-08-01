import {SelectorType} from '@storng/store';

export const createSelector = <R = any>(
	transform: (...args: Array<any>) => R,
	dependencies: Array<SelectorType>,
	defaultValue?: R,
): SelectorType => {
	return {
		defaultValue: defaultValue
			? defaultValue
			: transform(...dependencies.map(() => undefined)),
		dependencies,
		transform,
	};
};
