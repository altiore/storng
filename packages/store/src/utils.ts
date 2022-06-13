export function deepAssign(
	_target: Record<string, any>,
	...sources: Array<Record<string, any>>
) {
	const target = {..._target};
	for (const source of sources) {
		for (const k in source) {
			const vs = source[k];
			const vt = target[k];
			if (Object(vs) === vs && Object(vt) === vt) {
				target[k] = deepAssign(vt, {...vs});
				continue;
			}
			target[k] = source[k];
		}
	}
	return target;
}
