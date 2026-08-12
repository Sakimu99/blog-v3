import { describe, expect, it } from 'vitest'
import { getSafeLink, isExtLink, isHttpLink } from '~~/shared/utils/link'

describe('安全链接', () => {
	it.each([
		['/archive', '/archive'],
		['article/intro', 'article/intro'],
		['#comments', '#comments'],
	])('保留安全站内链接 %s', (input, expected) => {
		expect(getSafeLink(input)).toBe(expected)
	})

	it('保留 HTTP(S) 外链', () => {
		expect(getSafeLink('https://example.com/article')).toBe('https://example.com/article')
		expect(isHttpLink('http://example.com')).toBe(true)
		expect(isExtLink('https://example.com')).toBe(true)
	})

	it.each([
		'javascript:alert(1)',
		'JaVaScRiPt:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'vbscript:msgbox(1)',
		'file:///etc/passwd',
		'//example.com',
		`${String.fromCharCode(0)}https://example.com`,
	])('拒绝危险链接 %s', (input) => {
		expect(getSafeLink(input)).toBeUndefined()
		expect(isExtLink(input)).toBe(false)
	})
})
