type DeepPartial<T> = T extends Record<string, any>
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
	  }
	: T;

export function deepAssign<T extends Record<string, any> = Record<string, any>>(
	_target: T,
	...sources: Array<DeepPartial<T>>
): T {
	const target = {..._target};
	for (const source of sources) {
		for (const k in source) {
			const vs = source[k];
			const vt = target[k];
			if (Object(vs) === vs && Object(vt) === vt) {
				target[k] = deepAssign(vt, {...vs});
				continue;
			}
			target[k] = source[k] as any;
		}
	}
	return target;
}
