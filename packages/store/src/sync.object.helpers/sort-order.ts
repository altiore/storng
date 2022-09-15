export const sortData = (data: any[], sort?: string) => {
	if (!sort || !data || !data?.length) {
		return data;
	}
	const [orderBy, order] = sort.split(',');
	return data.slice(0).sort((a: any, b: any) => {
		const fA = a?.[orderBy];
		const fB = b?.[orderBy];

		if (typeof fA === 'string' && typeof fB === 'string') {
			if (order === 'ASC') {
				return fA.toLowerCase() < fB.toLowerCase() ? -1 : 1;
			} else {
				return fA.toLowerCase() < fB.toLowerCase() ? 1 : -1;
			}
		}

		if (typeof fA === 'number' && typeof fB === 'number') {
			if (order === 'ASC') {
				return fA - fB;
			} else {
				return fB - fA;
			}
		}

		return 0;
	});
};
