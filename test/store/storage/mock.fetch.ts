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

const successFetchList2Json: any = () =>
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
const successFetchList1Json: any = () =>
	sinon.spy(
		() =>
			new Promise((resolve) => {
				resolve({
					data: [{email: 'user-3@mail.com', id: 'user-id-3'}],
					ok: true,
				});
			}),
	);

const successFetchItemJson: any = () =>
	sinon.spy(
		() =>
			new Promise((resolve) => {
				resolve({
					data: {email: 'user-0@mail.com', id: 'user-id-0'},
					ok: true,
				});
			}),
	);
export const mockSuccessListFetch: any = sinon.spy((url: string) => {
	if (url === '/base/users?limit=2&page=2') {
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve({
					json: successFetchList1Json(),
				} as any);
			}, 100);
		});
	}
	if (url === '/base/users/user-id-0') {
		return new Promise((resolve) => {
			resolve({
				json: successFetchItemJson(),
			} as any);
		});
	}
	return new Promise((resolve) => {
		resolve({
			json: successFetchList2Json(),
		} as any);
	});
});

const emptyFetchJson: any = () =>
	sinon.spy(
		() =>
			new Promise((resolve) => {
				resolve({
					data: [],
					ok: true,
				});
			}),
	);

export const mockEmptyListFetch: any = sinon.spy(() => {
	return new Promise((resolve) => {
		resolve({
			json: emptyFetchJson(),
		} as any);
	});
});
