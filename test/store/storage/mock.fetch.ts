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

const successFetchListJson: any = () =>
	sinon.spy(
		() =>
			new Promise((resolve) => {
				resolve({
					data: [
						{email: 'user-0@mail.com', id: 'user-id-0'},
						{email: 'user-1@mail.com', id: 'user-id-1'},
					],
					ok: true,
				});
			}),
	);

export const mockSuccessListFetch: any = sinon.spy(() => {
	return new Promise((resolve) => {
		resolve({
			json: successFetchListJson(),
		} as any);
	});
});
