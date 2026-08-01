class DynamicResourceRemover {
	element(element: Element) {
		// 先复制属性名；HTMLRewriter 不允许一边遍历属性一边修改属性集合。
		const attributeNames = Array.from(element.attributes, ([name]) => name)
		for (const name of attributeNames) {
			if (name.toLowerCase().startsWith('on')) {
				element.removeAttribute(name)
			}
		}

		if (element.tagName === 'script' && element.getAttribute('type')?.toLowerCase() !== 'application/ld+json') {
			element.remove()
		}
		else if (element.tagName === 'style' || element.tagName === 'iframe') {
			element.remove()
		}
	}
}

class CommentRemover {
	comments(comment: Comment) {
		comment.remove()
	}
}

/**
 * 保留 Pages 已预渲染的正文与 SEO metadata，仅移除需要浏览器执行的资源。
 * 样式链接保留，避免在流式 HTML 处理中改变 void 元素导致内容截断。
 */
export function transformBotHtml(response: Response): Response {
	return new HTMLRewriter()
		.on('*', new DynamicResourceRemover())
		.onDocument(new CommentRemover())
		.transform(response)
}
