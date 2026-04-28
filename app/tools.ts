interface ToolItem {
	title: string
	description?: string
	link: string
	icon?: string
}

const tools: ToolItem[] = [
	{
		title: 'Nuxt',
		description: 'Nuxt 官方网站与完整文档，适合查框架能力与实践方案。',
		link: 'https://nuxt.com/',
		icon: 'https://nuxt.com/icon.png',
	},
	{
		title: 'Vue',
		description: 'Vue 官方文档，适合查组合式 API、组件模式和最佳实践。',
		link: 'https://vuejs.org/',
		icon: 'https://vuejs.org/logo.svg',
	},
	{
		title: 'MDN Web Docs',
		description: '前端基础 API 与浏览器能力查询手册，查语法和兼容性很方便。',
		link: 'https://developer.mozilla.org/zh-CN/',
		icon: 'https://developer.mozilla.org/favicon-48x48.cbbd161b.png',
	},
	{
		title: 'Can I use',
		description: '查询浏览器兼容性，评估新特性能否安全落地。',
		link: 'https://caniuse.com/',
		icon: 'https://caniuse.com/img/favicon-128.png',
	},
	{
		title: 'Iconify',
		description: '统一检索图标资源，当前项目里很多图标都能从这里找到。',
		link: 'https://icon-sets.iconify.design/',
		icon: 'https://icon-sets.iconify.design/favicon.ico',
	},
	{
		title: 'Yesicon',
		description: '适合按关键词搜索图标，和当前项目注释里推荐的用法一致。',
		link: 'https://yesicon.app/',
		icon: 'https://yesicon.app/favicon.ico',
	},
] satisfies ToolItem[]

export default tools
export type { ToolItem }
