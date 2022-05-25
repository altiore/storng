export default (
	routes: Record<string, any>,
	reducers: Record<string, any>,
): Record<string, any> => ({
	reducers,
	routes,
	url: '/base-url',
});
