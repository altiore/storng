// import React from 'react';
//
// import { StornMap, StornSelector } from '~/@storn/@types';
//
// import { list, record } from '../../';
// import api from '../api/api1';
//
// const routes: any = {
// 	get: {
// 		method: 'GET',
// 		url: '/auth',
// 	},
// 	update: {
// 		method: 'PATCH',
// 		url: '/auth',
// 	},
// };
//
// export const {selector: authFun, actions: authAct} = record(
// 	StornMap.Auth,
// 	'localStorage',
// 	api(routes, {
// 		get: record.replace,
// 		update: record.update,
// 		login: record.update,
// 	}),
// );
//
// export const {selector: usersFun, actions: usersAct} = list(
// 	StornMap.Users,
// 	'localStorage',
// 	api({routes, customRoute: ''}, {
// 		get: record.replace,
// 		update: record.update,
// 		customRoute: record.custom(),
// 	}),
// );
//
// const select = (() => null) as any;
//
// const authUsers = select(StornSelector.AuthUsers, (get) => {
// 	const auth = get(StornMap.Auth);
// 	const users = get(StornMap.Users);
// });

// const MyComponent = connect(() => {
// 	return (
// 		<div>
// 			test
// 		</div>
// 	);
// }, {authFun, authUsers});
