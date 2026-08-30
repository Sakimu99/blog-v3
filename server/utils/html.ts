import { getSafeLink } from '~~/shared/utils/link'

export function escapeHtml(value = '') {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll('\'', '&#39;')
}

export function getSafeAbsoluteUrl(value: string | undefined, base: string) {
	const safeValue = getSafeLink(value)
	if (!safeValue)
		return

	try {
		const url = new URL(safeValue, base)
		return url.protocol === 'http:' || url.protocol === 'https:'
			? url.toString()
			: undefined
	}
	catch {

	}
}

export function serializeJsonForScript(value: object) {
	return JSON.stringify(value)
		.replaceAll('<', '\\u003C')
		.replaceAll('>', '\\u003E')
		.replaceAll('&', '\\u0026')
		.replaceAll(String.fromCharCode(0x2028), '\\u2028')
		.replaceAll(String.fromCharCode(0x2029), '\\u2029')
}
