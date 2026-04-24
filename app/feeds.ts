import type { FeedGroup } from '../app/types/feed'

export default [
	{
		name: '参考友链',
		desc: '仅保留一条友链作为格式参考。',
		entries: [
			{
				author: 'GuuGuai',
				sitenick: '杂记本',
				title: '古怪杂记本',
				desc: '一个什么都可能会写的博客',
				link: 'https://blog.guuguai.site/',
				feed: 'https://blog.guuguai.site/atom.xml',
				icon: 'https://cravatar.cn/avatar/646331BFF8F19A0E05679C3CC0FC54D6',
				avatar: 'https://cdn.libravatar.org/avatar/646331bff8f19a0e05679c3cc0fc54d6?s=160',
				archs: ['Nuxt', 'Netlify'],
				date: '2023-12-23',
				comment: '保留下来作为友链字段格式与展示效果的参考项。',
			},
		],
	},
] satisfies FeedGroup[]
