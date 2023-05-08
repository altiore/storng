export const getFingerprint = (): string => {
	try {
		return navigator.userAgent.replace(/[0-9/.]/g, '');
	} catch (e) {
		return '';
	}
};
