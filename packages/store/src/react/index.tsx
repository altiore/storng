import React, {JSXElementConstructor} from 'react';

import {LoadedItem, MaybeRemoteData} from '@storng/store';

import {getLoading} from './func-data/maybe-remote.data';

type GetState<T> = {
	[P in keyof T]: T extends Record<string, infer ValType> ? ValType : never;
};

type GetProps<WrappedComponent, T> = Omit<
	WrappedComponent extends JSXElementConstructor<infer ParentProps>
		? ParentProps
		: never,
	keyof T
>;

export const connect = function <T extends Record<string, any>>(
	WrappedComponent: JSXElementConstructor<any>,
	selectors: {
		[P in keyof T]: (
			subscriber: (state: MaybeRemoteData<LoadedItem<any>>) => void,
		) => Promise<() => Promise<void>>;
	},
): React.ComponentClass<GetProps<typeof WrappedComponent, T>, GetState<T>> {
	type ConnectProps = GetProps<typeof WrappedComponent, T>;
	type ConnectState = GetState<T>;

	return class ConnectHOC extends React.Component<ConnectProps, ConnectState> {
		subscribers: Array<() => any> = [];

		state: any = Object.keys(selectors).reduce((res, cur) => {
			res[cur] = getLoading();
			return res;
		}, {});

		public constructor(props) {
			super(props);

			Object.entries(selectors).map(([propName, subscribe]) => {
				const subscriber = this.setLoadedObjectProps.bind(this, propName);
				subscribe(subscriber).then((unsubscribe) => {
					this.subscribers.push(unsubscribe);
				});
			});
		}

		public componentWillUnmount() {
			this.subscribers.forEach((unsubscribe) => unsubscribe());
		}

		public setLoadedObjectProps(propName: keyof T, propValue: T[keyof T]) {
			this.setState({
				[propName]: propValue,
			} as any);
		}

		public render() {
			return <WrappedComponent {...this.state} {...this.props} />;
		}
	};
};
