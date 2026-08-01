import { isExplicitCrawlerUserAgent } from './bot-ua'
import { transformBotHtml } from './html-transform'

const pagesOrigin = 'https://blog-v3-ac6.pages.dev'
const articlePathRegex = /^\/\d{4}\/[^/?#]+\/?$/

function isArticlePath(pathname: string): boolean {
	return articlePathRegex.test(pathname)
}

function createOriginRequest(request: Request): Request {
	const incomingUrl = new URL(request.url)
	const originUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, pagesOrigin)
	const headers = new Headers()

	// 只转发静态源站需要的请求头，避免 Cookie、鉴权和条件请求跨源泄露或干扰缓存。
	headers.set('Accept', request.headers.get('Accept') ?? '*/*')
	headers.set('Accept-Language', request.headers.get('Accept-Language') ?? '')
	headers.set('Accept-Encoding', 'identity')
	headers.set('User-Agent', 'blog-bot-html/1.0')

	const contentType = request.headers.get('Content-Type')
	if (contentType)
		headers.set('Content-Type', contentType)

	return new Request(originUrl, {
		method: request.method,
		headers,
		body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
		redirect: 'manual',
	})
}

function isHtmlResponse(response: Response): boolean {
	return response.headers.get('Content-Type')?.toLowerCase().includes('text/html') ?? false
}

function createBotResponse(originResponse: Response): Response {
	const transformedResponse = transformBotHtml(originResponse)
	const headers = new Headers(transformedResponse.headers)

	// 改写响应不能复用源站的实体校验和压缩信息，且绝不与普通访客共用缓存。
	for (const name of ['Content-Encoding', 'Content-Length', 'Content-MD5', 'Content-Range', 'ETag'])
		headers.delete(name)

	headers.set('Cache-Control', 'private, no-store')
	headers.set('Content-Type', 'text/html; charset=utf-8')
	headers.set('X-Bot-Rendered', '1')
	headers.set('X-Bot-Source', 'pages-origin')

	return new Response(transformedResponse.body, {
		status: transformedResponse.status,
		statusText: transformedResponse.statusText,
		headers,
	})
}

export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url)
		let originResponse: Response

		try {
			// 使用固定的 pages.dev 源站，避免回源当前域名导致 Worker Route 递归。
			originResponse = await fetch(createOriginRequest(request))
		}
		catch {
			return new Response('Bad Gateway', { status: 502 })
		}

		const shouldTransform = request.method === 'GET'
			&& isExplicitCrawlerUserAgent(request.headers.get('User-Agent'))
			&& isArticlePath(url.pathname)
			&& originResponse.status === 200
			&& isHtmlResponse(originResponse)

		return shouldTransform ? createBotResponse(originResponse) : originResponse
	},
} satisfies ExportedHandler
