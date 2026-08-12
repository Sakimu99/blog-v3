import zin from '@zinkawaii/stylelint-config'

export default zin({
	// @keep-sorted
	rules: {
		'@stylistic/indentation': 'tab',
		'@stylistic/linebreaks': null,
		'declaration-no-important': null,
		'media-feature-range-notation': 'prefix',
		'order/properties-order': null,
	},
})
