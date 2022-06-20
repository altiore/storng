const successFetchJson: any = (accessToken) =>
	sinon.spy(
		() =>
			new Promise((resolve) => {
				resolve({
					data: {accessToken},
					ok: true,
				});
			}),
	);

export const mockSuccessItemFetch: any = sinon.spy((_, init) => {
	return new Promise((resolve) => {
		resolve({
			json: successFetchJson(JSON.parse(init.body)?.accessToken),
		} as any);
	});
});
