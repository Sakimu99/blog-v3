import { describe, expect, it } from 'vitest'
import { getBlogUrl, renderAtomContent } from '~~/server/utils/atom-feed'

describe('atom Feed 内容', () => {
	it('转义文章元数据并保留程序生成的 HTML', () => {
		const content = renderAtomContent({
			description: '</p><script>alert(1)</script>',
			image: 'https://images.example/cover.png?title="test"',
			path: '/article',
			title: '<文章>',
		})

		expect(content).toContain('&lt;/p&gt;&lt;script&gt;alert(1)&lt;/script&gt;')
		expect(content).toContain('alt="&lt;文章&gt;"')
		expect(content).toContain('rel="noopener noreferrer"')
		expect(content).not.toContain('<script>')
	})

	it('不将危险图片地址写入 Feed HTML', () => {
		const content = renderAtomContent({
			image: 'data:text/html,<script>alert(1)</script>',
			path: '/article',
			title: '文章',
		})

		expect(content).not.toContain('<img')
		expect(getBlogUrl('javascript:alert(1)')).toBe('https://blog.sakimu.com/')
	})
})
