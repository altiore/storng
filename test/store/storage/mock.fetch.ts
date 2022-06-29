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

const successVersionJson: any = () =>
	sinon.spy(
		() =>
			new Promise((resolve) => {
				resolve({
					data: {api: {api: '3.3.3', contracts: '3.3.3'}},
					ok: true,
				});
			}),
	);

export const mockVersionFetch: any = sinon.spy(() => {
	return new Promise((resolve) => {
		resolve({
			json: successVersionJson(),
		} as any);
	});
});
