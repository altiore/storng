// import { auth } from '~/@storn/entity/auth';
// import users from '~/@storn/entity/users';
// import {select} from '~/index';
// import {useState} from 'react';
//
// export const isAuth = select(([getAuth]) => {
//   return getAuth({
//     filled: ({data, limit, page}) => FunData.Yes(Boolean(data.accessToken)),
//     loading: ({prevData, isLoading}) => prevData ? FunData.Yes(Boolean(prevData.accessToken)) : FunData.Not(),
//     mistake: ({prevData, error}) => {
//       return prevData ? FunData.Yes(Boolean(prevData.accessToken)) : FunData.Not();
//     },
//     nothing: ({prevData, prevError}) => {
//       return FunData.Not();
//     },
//   });
// }, [auth]);
//
// export const registeredUsersFun = select({
//   registered: true,
// }, [users]);
//
// const MyComponent = connect(({isAuth}) => {
//   return isAuth({
//     Not: <div>Login</div>,
//     Yes: <div>Profile</div>,
//   });
// }, {isAuth});
//
// const UserList = connect(({usersFun}) => {
//   return usersFun({
//     filled: ({data, filter: {page, limit, order, orderBy}, loading}) => (),
//     loading: () => (),
//     mistake: <div>Profile</div>,
//     nothing: <div>Profile</div>,
//   });
// }, {usersFun: registeredUsersFun});
