const FINGERPRINT_NAME = 'fingerprint';

export const getFingerprint = async (): Promise<string> => {
	try {
		const {DeviceUUID} = await import('device-uuid');
		let existingFingerprint: string | null = null;
		try {
			existingFingerprint = window.sessionStorage.getItem(FINGERPRINT_NAME);
		} catch (err) {
			console.error(err);
		}
		if (existingFingerprint) {
			return existingFingerprint;
		}
		const newFingerprint = JSON.stringify({
			browser: navigator.userAgent.replace(/[0-9/.]/g, ''),
			device: new DeviceUUID().get(),
		});

		try {
			window.sessionStorage.setItem(FINGERPRINT_NAME, newFingerprint);
		} catch (err) {
			console.error(err);
		}
		return newFingerprint;
	} catch (e) {
		console.error(e);
		return Promise.resolve('');
	}
};
