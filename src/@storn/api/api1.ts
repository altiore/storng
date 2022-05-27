export default (
	routes: Record<string, any>,
	changeStrategy: Record<string, any>,
): Record<string, any> => ({
	changeStrategy,
	routes,
	url: '/base-url',
});
