export default defineEventHandler((event) => {
	setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
	setResponseHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
	setResponseHeader(event, 'X-Frame-Options', 'DENY')
	setResponseHeader(event, 'Permissions-Policy', 'camera=(), geolocation=(), microphone=(), payment=(), usb=()')
})
