import type { ContentCollectionItem } from '@nuxt/content'
import type { MinimarkTree } from 'minimark'
import { stringify } from 'minimark/stringify'
import blogConfig from '~~/blog.config'
import { escapeHtml, getSafeAbsoluteUrl, serializeJsonForScript } from './html'

function getUrl(path?: string) {
	return getSafeAbsoluteUrl(path, blogConfig.url) ?? blogConfig.url
}

function renderBody(post: ContentCollectionItem) {
	const body = post.body as unknown as MinimarkTree
	if (body?.type !== 'minimark')
		return ''
	try {
		return stringify(body, { format: 'text/html' })
	}
	catch (e) {
		console.error('[bot-html] 文章正文序列化失败', post.path, e)
		return ''
	}
}

function renderLayout(options: { title: string, description?: string, canonical: string, jsonLd: object, main: string }) {
	const { title, description, canonical, jsonLd, main } = options
	return `<!DOCTYPE html>
<html lang="${blogConfig.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
<link rel="canonical" href="${escapeHtml(canonical)}">
<script type="application/ld+json">${serializeJsonForScript(jsonLd)}</script>
</head>
<body>
${main}
</body>
</html>`
}

/** 为爬虫渲染文章详情的纯 HTML */
export function renderBotPostHtml(post: ContentCollectionItem) {
	const canonical = getUrl(post.path)
	const image = post.image ? getUrl(post.image) : undefined
	const categories = (post.categories ?? []).filter((c): c is string => typeof c === 'string')
	const tags = (post.tags ?? []).filter((t): t is string => typeof t === 'string')

	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		'headline': post.title,
		'description': post.description,
		'datePublished': post.published ?? post.date,
		'dateModified': post.updated ?? post.date,
		'author': { '@type': 'Person', 'name': post.author || blogConfig.author.name, 'url': blogConfig.author.homepage },
		'image': image,
		'mainEntityOfPage': canonical,
	}

	const main = `<main>
<article>
<h1>${escapeHtml(post.title)}</h1>
${post.description ? `<p>${escapeHtml(post.description)}</p>` : ''}
<p>
${post.date ? `<time datetime="${escapeHtml(post.date)}">发布于 ${escapeHtml(post.date)}</time>` : ''}
${post.updated ? ` · <time datetime="${escapeHtml(post.updated)}">更新于 ${escapeHtml(post.updated)}</time>` : ''}
</p>
${categories.length ? `<p>分类：${categories.map(escapeHtml).join(' / ')}</p>` : ''}
${tags.length ? `<p>标签：${tags.map(escapeHtml).join('、')}</p>` : ''}
${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(post.title)}">` : ''}
${renderBody(post)}
</article>
<footer>
<p><a href="${getUrl('/')}">${escapeHtml(blogConfig.title)}</a> · © ${escapeHtml(blogConfig.author.name)} · ${escapeHtml(blogConfig.copyright.abbr)}</p>
</footer>
</main>`

	return renderLayout({
		title: `${post.title} | ${blogConfig.title}`,
		description: post.description,
		canonical,
		jsonLd,
		main,
	})
}

/** 为爬虫渲染文章列表（首页/归档）的纯 HTML */
export function renderBotListHtml(posts: ContentCollectionItem[]) {
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'Blog',
		'name': blogConfig.title,
		'description': blogConfig.description || blogConfig.subtitle,
		'url': blogConfig.url,
		'author': { '@type': 'Person', 'name': blogConfig.author.name, 'url': blogConfig.author.homepage },
	}

	const items = posts.map(post => `<li>
<a href="${getUrl(post.path)}">${escapeHtml(post.title)}</a>
${post.date ? `<time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time>` : ''}
${post.description ? `<p>${escapeHtml(post.description)}</p>` : ''}
</li>`).join('\n')

	const main = `<main>
<h1>${escapeHtml(blogConfig.title)}</h1>
${blogConfig.subtitle ? `<p>${escapeHtml(blogConfig.subtitle)}</p>` : ''}
<h2>文章列表</h2>
<ul>
${items}
</ul>
<footer>
<p><a href="${getUrl('/atom.xml')}">Atom 订阅</a> · © ${escapeHtml(blogConfig.author.name)} · ${escapeHtml(blogConfig.copyright.abbr)}</p>
</footer>
</main>`

	return renderLayout({
		title: blogConfig.title,
		description: blogConfig.description || blogConfig.subtitle,
		canonical: blogConfig.url,
		jsonLd,
		main,
	})
}
