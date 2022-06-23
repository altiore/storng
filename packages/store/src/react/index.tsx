import React, {ComponentProps, FC} from 'react';

import {ActionFunc, GetActionFunc} from '@storng/common';
import {LoadedItem, MaybeRemoteData, SubsObj} from '@storng/store';

import {ConnectComponent} from './connect.component';
import {StoreContext} from './store.context';

type SelectorLift<
	S extends {[K in string]: (store: any) => SubsObj<any>} | undefined,
> = {
	[Prop in keyof S]: S[Prop] extends (store: any) => SubsObj<infer Item>
		? MaybeRemoteData<LoadedItem<Item>>
		: never;
};

type ValidStateProps<
	C extends FC<any>,
	S extends {[K in string]: (store: any) => SubsObj<any>} | undefined,
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
		[K in string]: (store: any) => SubsObj<any>;
	} = {[K in string]: (store: any) => SubsObj<any>},
>(
	WrappedComponent: C,
	selectors: ValidStateProps<C, S>,
): React.FC<
	Omit<ComponentProps<typeof WrappedComponent>, keyof typeof selectors>
>;

export function connect<
	C extends FC<any>,
	S extends
		| {
				[K in string]: (store: any) => SubsObj<any>;
		  }
		| undefined = {[K in string]: (store: any) => SubsObj<any>},
	A extends {[P in string]: GetActionFunc} | undefined = {
		[P in string]: GetActionFunc;
	},
>(
	WrappedComponent: C,
	selectors?: ValidStateProps<C, S>,
	actions?: ValidActionProps<C, A>,
): typeof selectors extends {[K in string]: SubsObj<any>}
	? typeof actions extends {[P in string]: (store: any) => ActionFunc<any>}
		? React.FC<
				Omit<
					ComponentProps<typeof WrappedComponent>,
					keyof typeof selectors | keyof typeof actions
				>
		  >
		: React.FC<
				Omit<ComponentProps<typeof WrappedComponent>, keyof typeof selectors>
		  >
	: typeof actions extends {[P in string]: (store: any) => ActionFunc<any>}
	? React.FC<
			Omit<ComponentProps<typeof WrappedComponent>, keyof typeof actions>
	  >
	: React.FC;

export function connect<
	C extends FC<any>,
	S extends
		| {
				[K in string]: (store: any) => SubsObj<any>;
		  }
		| undefined = {[K in string]: (store: any) => SubsObj<any>},
	A extends {[P in string]: GetActionFunc} | undefined = {
		[P in string]: GetActionFunc;
	},
>(
	WrappedComponent: C,
	selectors?: ValidStateProps<C, S>,
	actions?: ValidActionProps<C, A>,
): typeof selectors extends {[K in string]: SubsObj<any>}
	? typeof actions extends {[P in string]: (store: any) => ActionFunc<any>}
		? React.FC<
				Omit<
					ComponentProps<typeof WrappedComponent>,
					keyof typeof selectors | keyof typeof actions
				>
		  >
		: React.FC<
				Omit<ComponentProps<typeof WrappedComponent>, keyof typeof selectors>
		  >
	: typeof actions extends {[P in string]: (store: any) => ActionFunc<any>}
	? React.FC<
			Omit<ComponentProps<typeof WrappedComponent>, keyof typeof actions>
	  >
	: never {
	return ((ownProps: any) => {
		return (
			<StoreContext.Consumer>
				{(store) => (
					<ConnectComponent
						actions={actions}
						component={WrappedComponent}
						componentProps={ownProps}
						selectors={selectors}
						store={store}
					/>
				)}
			</StoreContext.Consumer>
		);
	}) as any;
}
