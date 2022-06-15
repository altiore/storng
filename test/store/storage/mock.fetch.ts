const successFetchJson = chai.spy<Promise<any>>(
	() =>
		new Promise((resolve) => {
			resolve({
				data: {id: 'my-id'},
				ok: true,
			});
		}),
);

export const mockSuccessItemFetch = chai.spy<
	string,
	RequestInit,
	Promise<Response>
>(
	() =>
		new Promise((resolve) => {
			resolve({
				json: successFetchJson,
			} as any);
		}),
);
