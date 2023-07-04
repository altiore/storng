export const getFingerprint = async (): Promise<string> => {
	try {
		const {DeviceUUID} = await import('device-uuid');
		return JSON.stringify({
			browser: navigator.userAgent.replace(/[0-9/.]/g, ''),
			device: new DeviceUUID().get(),
			// userAgent: navigator.userAgent,
		});
	} catch (e) {
		return Promise.resolve('');
	}
};
