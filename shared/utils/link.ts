import { fromUrl, parseDomain, ParseResultType } from 'parse-domain'
import { isPathFile } from 'site-config-stack/urls'

const domainTip: Record<string, string> = {
	'github.io': 'GitHub Pages 域名',
	'netlify.app': 'Netlify 域名',
	'pages.dev': 'Cloudflare 域名',
	'thisis.host': '纸鹿提供的域名',
	'vercel.app': 'Vercel 域名',
	'zeabur.app': 'Zeabur 域名',
}

export function getDomain(url: string) {
	const domain = fromUrl(url)
	return typeof domain === 'symbol' ? url : domain
}

export function getMainDomain(url: string, useIcann?: boolean) {
	const hostname = getDomain(url)
	const parseResult = parseDomain(hostname)
	if (parseResult.type !== ParseResultType.Listed)
		return hostname
	const { domain, topLevelDomains } = useIcann ? parseResult.icann : parseResult
	return `${domain}.${topLevelDomains.join('.')}`
}

export function getDomainType(mainDomain: string) {
	return domainTip[mainDomain]
}

const githubUsernameRegex = /github\.com\/([a-zA-Z0-9-]+)(?:\/[^/]+)?(\/?)$/

export function getGithubUsername(url?: string) {
	if (!url)
		return ''
	return url.match(githubUsernameRegex)?.[1] ?? ''
}

const protocolPattern = /^[a-z][a-z\d+.-]*:/i

function hasControlCharacter(value: string) {
	return [...value].some((char) => {
		const code = char.charCodeAt(0)
		return code <= 0x1F || code === 0x7F
	})
}

/** 返回可安全渲染的站内链接或 HTTP(S) 链接。 */
export function getSafeLink(url?: string) {
	const value = url?.trim()
	if (!value || hasControlCharacter(value))
		return

	if (value.startsWith('#'))
		return value
	if (value.startsWith('//'))
		return
	if (!protocolPattern.test(value))
		return value

	try {
		const parsed = new URL(value)
		return parsed.protocol === 'http:' || parsed.protocol === 'https:'
			? parsed.toString()
			: undefined
	}
	catch {

	}
}

export function isHttpLink(url?: string) {
	const safeUrl = getSafeLink(url)
	return safeUrl?.startsWith('http://') || safeUrl?.startsWith('https://') || false
}

export function isExtLink(url?: string) {
	const safeUrl = getSafeLink(url)
	return !!safeUrl && (isHttpLink(safeUrl) || !!isPathFile(safeUrl))
}

export function safelyDecodeUriComponent(str: string) {
	try {
		return decodeURIComponent(str)
	}
	catch {
		return str
	}
}
