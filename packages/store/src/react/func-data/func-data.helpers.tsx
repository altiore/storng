import React, {cloneElement, createElement, isValidElement} from 'react';

function isClassComponent(component: any) {
	return (
		typeof component === 'function' && !!component?.prototype?.isReactComponent
	);
}

function isFunctionComponent(component: any) {
	return (
		typeof component === 'function' &&
		!['failure', 'correct', 'loading', 'nothing', 'is', 'no'].includes(
			component.name,
		) &&
		String(component).includes('.createElement(')
	);
}

function isReactComponent(component: any) {
	return isClassComponent(component) || isFunctionComponent(component);
}

function localRunFunc<R = any, A = any>(
	func: R | ((a: {data?: A}) => R),
	args?: Record<string, any>,
): any {
	if (!func) {
		return null;
	}
	if (isValidElement(func)) {
		return cloneElement(func as any) as any;
	}
	if (isReactComponent(func)) {
		return createElement(func as any, args || {}) as any;
	}

	if (typeof func === 'function') {
		return (func as any)(args);
	}

	return func;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function runFunc<R = any, A = any>(
	func: R | ((a: {data?: A}) => R),
	args?: Record<string, any>,
	failure?: R | ((a: {data?: A}) => R),
): any {
	try {
		return localRunFunc(func, args);
	} catch (err1) {
		try {
			if (failure) {
				return localRunFunc(failure, {
					error: {error: err1, message: String(err1)},
				});
			}

			throw err1;
		} catch (err2) {
			return (
				<p style={{color: 'red'}}>
					Ошибка так же в компоненте failure или что-то принципиально
					неправильно: {String(err1)} and {err1 !== err2 ? String(err2) : ''}
				</p>
			);
		}
	}
}
