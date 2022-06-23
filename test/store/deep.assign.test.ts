import {deepAssign} from '@storng/store/src/utils';

describe('deepAssign', () => {
	it('2 простых объект', () => {
		const a = {data: {}, isLoaded: false, isLoading: false};
		const res = deepAssign(a, {isLoading: true});
		expect(res).to.be.not.eql(a);
		expect(res.isLoading).to.be.true;
	});

	it('2 вложенных объект', () => {
		const a = {
			data: {id: 'my-id', time: 12},
			isLoaded: false,
			isLoading: false,
		};
		const res = deepAssign(a, {data: {time: 14}});
		expect(res).to.be.not.eql(a);
		expect(res).to.be.eql({
			data: {id: 'my-id', time: 14},
			isLoaded: false,
			isLoading: false,
		});
	});

	it('с массивом', () => {
		const a = {
			data: [{id: 1}],
			isLoaded: false,
			isLoading: false,
		};
		const res = deepAssign(a, {data: [{id: 2}]});
		expect(res).to.be.not.eql(a);
		expect(res).to.be.eql({
			data: [{id: 1}, {id: 2}],
			isLoaded: false,
			isLoading: false,
		});
	});
});
