const successFetchJson = chai.spy(
	() =>
		new Promise((resolve) => {
			resolve({
				data: {id: 'my-id'},
				ok: true,
			});
		}),
);

export const mockSuccessItemFetch = chai.spy(
	() =>
		new Promise((resolve) => {
			resolve({
				json: successFetchJson,
			});
		}),
);
