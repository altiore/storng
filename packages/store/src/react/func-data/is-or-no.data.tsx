import {IsOrNo} from '@storng/store';

import {runFunc} from './func-data.helpers';

export const getIs: IsOrNo = ({is}) => {
	return runFunc(is);
};

export const getNo: IsOrNo = ({no}) => {
	return runFunc(no);
};
