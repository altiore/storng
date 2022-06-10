import React, {JSXElementConstructor} from 'react';

type GetSelector<T> = Record<string, T>;

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
	selectors: {[P in keyof T]: GetSelector<T[P]>},
): React.ComponentClass<GetProps<typeof WrappedComponent, T>, GetState<T>> {
	type ConnectProps = GetProps<typeof WrappedComponent, T>;
	type ConnectState = GetState<T>;

	return class ConnectHOC extends React.Component<ConnectProps, ConnectState> {
		subscribers: any[];

		public componentDidMount() {
			this.subscribers = Object.entries(selectors).map(
				([propName, subscribe]) => {
					return subscribe(this.setLoadedObjectProps.bind(this, propName));
				},
			);
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
