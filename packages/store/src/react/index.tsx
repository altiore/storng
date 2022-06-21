import React, {ComponentProps, FC} from 'react';

import {RequestFunc} from '@storng/common';
import {LoadedItem, MaybeRemoteData, SubsObj} from '@storng/store';

import {getLoading} from './func-data/maybe-remote.data';

type SelectorLift<S extends {[K in string]: SubsObj<any>} | undefined> = {
	[Prop in keyof S]: S[Prop] extends SubsObj<infer Item>
		? MaybeRemoteData<LoadedItem<Item>>
		: never;
};

type ValidStateProps<
	C extends FC<any>,
	S extends {[K in string]: SubsObj<any>} | undefined,
> = ComponentProps<C> extends SelectorLift<S> ? S : undefined;

type ActionLift<
	A extends {[P in string]: RequestFunc<any>} | undefined = {
		[P in string]: RequestFunc<any>;
	},
> = {
	[Prop in keyof A]: A[Prop] extends RequestFunc<infer R>
		? RequestFunc<R>
		: never;
};

type ValidActionProps<
	C extends FC<any>,
	A extends {[P in string]: RequestFunc<any>} | undefined = {
		[P in string]: RequestFunc<any>;
	},
> = ComponentProps<C> extends ActionLift<A> ? A : undefined;

export function connect<
	C extends FC<any>,
	S extends {
		[K in string]: SubsObj<any>;
	} = {[K in string]: SubsObj<any>},
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
				[K in string]: SubsObj<any>;
		  }
		| undefined = {[K in string]: SubsObj<any>},
	A extends {[P in string]: RequestFunc<any>} | undefined = {
		[P in string]: RequestFunc<any>;
	},
>(
	WrappedComponent: C,
	selectors?: ValidStateProps<C, S>,
	actions?: ValidActionProps<C, A>,
): typeof selectors extends {[K in string]: SubsObj<any>}
	? typeof actions extends {[P in string]: RequestFunc<any>}
		? React.FC<
				Omit<
					ComponentProps<typeof WrappedComponent>,
					keyof typeof selectors | keyof typeof actions
				>
		  >
		: React.FC<
				Omit<ComponentProps<typeof WrappedComponent>, keyof typeof selectors>
		  >
	: typeof actions extends {[P in string]: RequestFunc<any>}
	? React.FC<
			Omit<ComponentProps<typeof WrappedComponent>, keyof typeof actions>
	  >
	: React.FC;

export function connect<
	C extends FC<any>,
	S extends
		| {
				[K in string]: SubsObj<any>;
		  }
		| undefined = {[K in string]: SubsObj<any>},
	A extends {[P in string]: RequestFunc<any>} | undefined = {
		[P in string]: RequestFunc<any>;
	},
>(
	WrappedComponent: C,
	selectors?: ValidStateProps<C, S>,
	actions?: ValidActionProps<C, A>,
): typeof selectors extends {[K in string]: SubsObj<any>}
	? typeof actions extends {[P in string]: RequestFunc<any>}
		? React.FC<
				Omit<
					ComponentProps<typeof WrappedComponent>,
					keyof typeof selectors | keyof typeof actions
				>
		  >
		: React.FC<
				Omit<ComponentProps<typeof WrappedComponent>, keyof typeof selectors>
		  >
	: typeof actions extends {[P in string]: RequestFunc<any>}
	? React.FC<
			Omit<ComponentProps<typeof WrappedComponent>, keyof typeof actions>
	  >
	: never {
	return class ConnectHOC extends React.Component {
		subscribers: Array<() => void> = [];

		state: any = {
			...(selectors
				? Object.keys(selectors).reduce<any>((res, cur) => {
						res[cur] = getLoading();
						return res;
				  }, {})
				: {}),
			...(actions || {}),
		};

		public componentDidMount() {
			if (selectors) {
				Object.entries(selectors as {[K in string]: SubsObj<any>}).map(
					([propName, syncObj]) => {
						const subscriber = this.setLoadedObjectProps.bind(
							this,
							propName as keyof {[K in string]: SubsObj<any>},
						);
						syncObj.subscribe(subscriber as any).then((unsubscribe) => {
							this.subscribers.push(unsubscribe);
						});
					},
				);
			}
		}

		public componentWillUnmount() {
			this.subscribers.forEach((unsubscribe) => unsubscribe());
		}

		public setLoadedObjectProps(
			propName: keyof {[K in string]: SubsObj<any>},
			propValue: {[K in string]: SubsObj<any>}[keyof {
				[K in string]: SubsObj<any>;
			}],
		) {
			this.setState({
				[propName]: propValue,
			});
		}

		public render() {
			return <WrappedComponent {...this.state} {...this.props} />;
		}
	} as any;
}
