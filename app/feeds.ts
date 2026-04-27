import type { FeedGroup } from '../app/types/feed'

export default [
	{
		name: '友链',
		desc: '感谢一路走来遇到的佬们',
		entries: [
			{
				author: '小森',
				sitenick: '雾创岛',
				title: '雾创岛',
				desc: '心存敬畏 行有所止 珍惜当下 不负时光',
				link: 'https://tr0.cn/',
				feed: 'https://tr0.cn/atom.xml',
				icon: 'https://www.tr0.cn/favicon.ico',
				avatar: 'https://q2.qlogo.cn/headimg_dl?dst_uin=2407435866&spec=0',
				archs: ['Nuxt', 'Netlify'],
				date: '2026-05-01',
				comment: '最初的站长，最好的站长。',
			},
			{
				author: '二叉树树',
				sitenick: 'AcoFork',
				title: '二叉树树',
				desc: 'Protect What You Love.',
				link: 'https://2x.nz/',
				feed: 'https://2x.nz/atom.xml',
				icon: 'https://q2.qlogo.cn/headimg_dl?dst_uin=2726730791&spec=0',
				avatar: 'https://q2.qlogo.cn/headimg_dl?dst_uin=2726730791&spec=0',
				archs: ['Nuxt', 'Netlify'],
				date: '2026-05-01',
				comment: '二叉树树本尊。',
			},

		],
	},
] satisfies FeedGroup[]
