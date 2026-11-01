import { applySecurityHeaders, isAllowedMethod } from './security'
import {
	handleProbeApi,
	purgeExpiredProbeData,
	runNetworkProbes,
	type ProbeEnv,
} from './probes'

interface Env extends ProbeEnv {
	PAGES_ORIGIN?: string
}

const defaultPagesOrigin = 'https://blog-v3-ac6.pages.dev'
const cleanupCron = '17 2 * * *'

function createOriginRequest(request: Request, pagesOrigin: string): Request {
	const incomingUrl = new URL(request.url)
	const originUrl = new URL(incomingUrl.pathname + incomingUrl.search, pagesOrigin)
	const headers = new Headers()

	headers.set('Accept', request.headers.get('Accept') ?? '*/*')
	headers.set('Accept-Language', request.headers.get('Accept-Language') ?? '')
	headers.set('Accept-Encoding', 'identity')
	headers.set('User-Agent', 'blog-v3-edge/1.0')

	const requestHeaders = ['If-Modified-Since', 'If-None-Match', 'Range']
	for (const name of requestHeaders) {
		const value = request.headers.get(name)
		if (value)
			headers.set(name, value)
	}

	return new Request(originUrl, {
		method: request.method,
		headers,
		redirect: 'manual',
	})
}

function createSecureResponse(response: Response): Response {
	const headers = new Headers(response.headers)
	applySecurityHeaders(headers)
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

function createErrorResponse(status: number, message: string): Response {
	const headers = new Headers({ 'Cache-Control': 'no-store' })
	applySecurityHeaders(headers)
	return new Response(message, { status, headers })
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url)

		if (url.pathname === '/api/probes' || url.pathname.startsWith('/api/probes/'))
			return handleProbeApi(request, env)

		if (!isAllowedMethod(request.method))
			return createErrorResponse(405, 'Method Not Allowed')

		try {
			const response = await fetch(createOriginRequest(
				request,
				env.PAGES_ORIGIN || defaultPagesOrigin,
			))
			return createSecureResponse(response)
		}
		catch {
			return createErrorResponse(502, 'Bad Gateway')
		}
	},

	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		if (controller.cron === cleanupCron)
			ctx.waitUntil(purgeExpiredProbeData(env))
		else
			ctx.waitUntil(runNetworkProbes(env))
	},
} satisfies ExportedHandler<Env>
