import type { ContentCollectionItem } from '@nuxt/content'
import blogConfig from '~~/blog.config'
import { escapeHtml, getSafeAbsoluteUrl } from './html'

type FeedPost = Pick<ContentCollectionItem, 'description' | 'image' | 'path' | 'title'>

export function getBlogUrl(path?: string) {
	return getSafeAbsoluteUrl(path, blogConfig.url) ?? blogConfig.url
}

export function renderAtomContent(post: FeedPost) {
	const image = getSafeAbsoluteUrl(post.image, blogConfig.url)
	return [
		image && `<img src="${escapeHtml(image)}" alt="${escapeHtml(post.title)}" />`,
		post.description && `<p>${escapeHtml(post.description)}</p>`,
		`<a class="view-full" href="${escapeHtml(getBlogUrl(post.path))}" target="_blank" rel="noopener noreferrer">点击查看全文</a>`,
	].filter(Boolean).join(' ')
}
