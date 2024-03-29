import React, {ComponentProps, FC} from 'react';

import {ActionFunc, GetActionFunc} from '@storng/common';
import {SelectorType} from '@storng/store';

import {ConnectComponent} from './connect.component';
import {StoreContext} from './store.context';

type SelectorLift<S extends {[K in string]: SelectorType} | undefined> = {
	[Prop in keyof S]: S[Prop] extends SelectorType
		? // TODO: указать правильный тип
		  any
		: never;
};

type ValidStateProps<
	C extends FC<any>,
	S extends {[K in string]: SelectorType} | undefined,
> = ComponentProps<C> extends SelectorLift<S> ? S : undefined;

type ActionLift<
	A extends {[P in string]: GetActionFunc} | undefined = {
		[P in string]: GetActionFunc;
	},
> = {
	[Prop in keyof A]: A[Prop] extends GetActionFunc<infer R>
		? ActionFunc<R>
		: never;
};

type ValidActionProps<
	C extends FC<any>,
	A extends {[P in string]: GetActionFunc} | undefined = {
		[P in string]: GetActionFunc;
	},
> = ComponentProps<C> extends ActionLift<A> ? A : never;

export function connect<
	C extends FC<any>,
	S extends {
		[K in string]: SelectorType;
	} = {[K in string]: SelectorType},
>(
	WrappedComponent: C,
	selectors: ValidStateProps<C, S>,
): (props: Omit<ComponentProps<C>, keyof S>) => JSX.Element;

export function connect<
	C extends FC<any>,
	S extends
		| {
				[K in string]: SelectorType;
		  }
		| undefined = {
		[K in string]: SelectorType;
	},
	A extends {[P in string]: GetActionFunc} | undefined = {
		[P in string]: GetActionFunc;
	},
>(
	WrappedComponent: C,
	selectors?: ValidStateProps<C, S>,
	actions?: ValidActionProps<C, A>,
): typeof selectors extends undefined
	? typeof actions extends undefined
		? never
		: (props: Omit<ComponentProps<C>, keyof A>) => JSX.Element
	: typeof actions extends undefined
	? (props: Omit<ComponentProps<C>, keyof S>) => JSX.Element
	: (props: Omit<ComponentProps<C>, keyof A | keyof S>) => JSX.Element;

export function connect<
	C extends FC<any>,
	S extends
		| {
				[K in string]: SelectorType;
		  }
		| undefined = {
		[K in string]: SelectorType;
	},
	A extends {[P in string]: GetActionFunc} | undefined = {
		[P in string]: GetActionFunc;
	},
>(
	WrappedComponent: C,
	selectors?: ValidStateProps<C, S>,
	actions?: ValidActionProps<C, A>,
): typeof selectors extends undefined
	? typeof actions extends undefined
		? never
		: (props: Omit<ComponentProps<C>, keyof A>) => JSX.Element
	: typeof actions extends undefined
	? (props: Omit<ComponentProps<C>, keyof S>) => JSX.Element
	: (props: Omit<ComponentProps<C>, keyof A | keyof S>) => JSX.Element {
	return ((ownProps: any) => {
		return (
			<StoreContext.Consumer>
				{(store) => (
					<ConnectComponent
						actions={actions}
						component={WrappedComponent}
						componentProps={ownProps}
						selectors={selectors as any}
						store={store}
					/>
				)}
			</StoreContext.Consumer>
		);
	}) as any;
}

export {createSelector} from './create-selector';
export {getIs, getNo} from './func-data/is-or-no.data';
export {useAction} from './use-action';
export {useSelector} from './use-selector';
