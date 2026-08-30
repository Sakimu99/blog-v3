import antfu from '@antfu/eslint-config'

export default antfu({
	ignores: ['*.yaml', 'content/**'],
	stylistic: {
		indent: 'tab',
	},
	pnpm: true,
	// @keep-sorted
	rules: {
		// Nuxt Content 将 Markdown 虚拟为多种语法文件；仅在真实文件的覆盖层启用对应规则。
		'jsonc/indent': 'off',
		'vue/block-lang': 'off',
		'vue/enforce-style-attribute': 'off',
		'vue/html-indent': 'off',
		'yaml/indent': 'off',
	},
}, {
	files: ['**/*.json'],
	ignores: ['content/**'],
	rules: {
		'jsonc/indent': ['error', 2],
		'style/eol-last': ['warn', 'never'],
	},
}, {
	files: ['**/*.vue'],
	rules: {
		'vue/block-lang': ['warn', {
			script: { lang: ['ts', 'tsx'] },
			style: { lang: ['scss'] },
		}],
		'vue/enforce-style-attribute': ['warn', {
			allow: ['scoped'],
		}],
		'vue/html-indent': 'off',
	},
}, {
	files: ['content/**'],
	// @keep-sorted
	rules: {
		'antfu/consistent-list-newline': 'off',
		'eqeqeq': 'off',
		'jsonc/comma-dangle': 'off',
		'jsonc/indent': 'off',
		'no-irregular-whitespace': 'off',
		'no-sequences': 'off',
		'prefer-arrow-callback': 'off',
		'prefer-template': 'off',
		'style/indent': 'off',
		'style/no-mixed-spaces-and-tabs': 'off',
		'style/quotes': 'off',
		'style/semi': 'off',
		'unicorn/prefer-includes': 'off',
		'vue/block-lang': 'off',
		'vue/enforce-style-attribute': 'off',
		'vue/html-indent': 'off',
	},
})
