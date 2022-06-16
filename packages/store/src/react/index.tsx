import React, {ComponentProps, FC} from 'react';

import {LoadedItem, MaybeRemoteData, SubsObj} from '@storng/store';

import {getLoading} from './func-data/maybe-remote.data';

type SelectorLift<S extends {[K in string]: SubsObj<any>}> = {
	[Prop in keyof S]: S[Prop] extends SubsObj<infer Item>
		? MaybeRemoteData<LoadedItem<Item>>
		: never;
};

type ValidStateProps<
	C extends FC<any>,
	S extends {[K in string]: SubsObj<any>},
> = ComponentProps<C> extends SelectorLift<S> ? S : never;

export const connect = function <
	C extends FC<any>,
	S extends {
		[K in string]: SubsObj<any>;
	} = {[K in string]: SubsObj<any>},
>(
	WrappedComponent: C,
	selectors: ValidStateProps<C, S>,
): React.FC<
	Omit<ComponentProps<typeof WrappedComponent>, keyof typeof selectors>
> {
	return class ConnectHOC extends React.Component {
		subscribers: Array<() => void> = [];

		state: any = Object.keys(selectors).reduce<any>((res, cur) => {
			res[cur] = getLoading();
			return res;
		}, {});

		public constructor(props: ComponentProps<C>) {
			super(props);

			Object.entries(selectors).map(([propName, syncObj]) => {
				const subscriber = this.setLoadedObjectProps.bind(this, propName);
				syncObj.subscribe(subscriber as any).then((unsubscribe) => {
					this.subscribers.push(unsubscribe);
				});
			});
		}

		public componentWillUnmount() {
			this.subscribers.forEach((unsubscribe) => unsubscribe());
		}

		public setLoadedObjectProps(propName: keyof S, propValue: S[keyof S]) {
			this.setState({
				[propName]: propValue,
			} as any);
		}

		public render() {
			return <WrappedComponent {...this.state} {...this.props} />;
		}
	} as any;
};
