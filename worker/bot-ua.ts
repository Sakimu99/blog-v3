/**
 * 仅匹配明确的搜索引擎与社交预览爬虫，避免泛化关键词误伤正常客户端。
 * UA 仅用于选择页面呈现方式，不能作为权限或访问控制依据。
 */
const crawlerTokens = [
	'googlebot',
	'google-inspectiontool',
	'bingbot',
	'bingpreview',
	'baiduspider',
	'yandexbot',
	'duckduckbot',
	'sogou',
	'360spider',
	'bytespider',
	'yisouspider',
	'petalbot',
	'facebookexternalhit',
	'twitterbot',
	'linkedinbot',
	'slackbot',
	'discordbot',
	'telegrambot',
	'whatsapp',
]

export function isExplicitCrawlerUserAgent(userAgent: string | null): boolean {
	const normalizedUserAgent = userAgent?.toLowerCase()
	return !!normalizedUserAgent && crawlerTokens.some(token => normalizedUserAgent.includes(token))
}
