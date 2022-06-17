const successFetchJson: any = sinon.spy(
	() =>
		new Promise((resolve) => {
			resolve({
				data: {accessToken: 'accessToken'},
				ok: true,
			});
		}),
);

export const mockSuccessItemFetch: any = sinon.spy(
	() =>
		new Promise((resolve) => {
			resolve({
				json: successFetchJson,
			} as any);
		}),
);
