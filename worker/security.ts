const allowedMethods = ['GET', 'HEAD'] as const

export function isAllowedMethod(method: string): method is typeof allowedMethods[number] {
	return allowedMethods.includes(method as typeof allowedMethods[number])
}

export function applySecurityHeaders(headers: Headers) {
	headers.set('Strict-Transport-Security', 'max-age=31536000')
	headers.set('X-Content-Type-Options', 'nosniff')
	headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
	headers.set('X-Frame-Options', 'DENY')
	headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=(), payment=(), usb=()')
}
