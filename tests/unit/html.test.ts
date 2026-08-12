import { describe, expect, it } from 'vitest'
import { escapeHtml, getSafeAbsoluteUrl, serializeJsonForScript } from '~~/server/utils/html'

describe('服务端 HTML 安全工具', () => {
	it('转义 HTML 文本与属性', () => {
		expect(escapeHtml(`<img src="x" onerror='alert(1)'>&`)).toBe('&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;')
	})

	it('只构建 HTTP(S) 绝对 URL', () => {
		expect(getSafeAbsoluteUrl('/article', 'https://blog.example')).toBe('https://blog.example/article')
		expect(getSafeAbsoluteUrl('https://image.example/cover.png', 'https://blog.example')).toBe('https://image.example/cover.png')
		expect(getSafeAbsoluteUrl('javascript:alert(1)', 'https://blog.example')).toBeUndefined()
	})

	it('防止 JSON-LD 提前结束 script', () => {
		const serialized = serializeJsonForScript({ title: '</script><script>alert(1)</script>' })
		expect(serialized).not.toContain('</script>')
		expect(JSON.parse(serialized)).toEqual({ title: '</script><script>alert(1)</script>' })
	})
})
