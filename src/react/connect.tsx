import React, {JSXElementConstructor} from 'react';

type GetSelector<T> = Record<string, T>;

export const connect = function <T extends Record<string, any>>(
	WrappedComponent: JSXElementConstructor<any>,
	selectors: {[P in keyof T]: GetSelector<T[P]>},
) {
	type WrappedComponentProps =
		typeof WrappedComponent extends JSXElementConstructor<infer ParentProps>
			? ParentProps
			: never;
	type ConnectProps = Omit<WrappedComponentProps, keyof T>;
	type ConnectState = {
		[P in keyof T]: T extends Record<string, infer ValType> ? ValType : never;
	};

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

		public setLoadedObjectProps(propName: string, propValue) {
			console.log('setLoadedObjectProps', {
				propName,
				propValue,
			});
			this.setState({
				[propName]: propValue,
			} as any);
		}

		public render() {
			return <WrappedComponent {...this.state} {...this.props} />;
		}
	};
};
