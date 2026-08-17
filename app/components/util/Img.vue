<script setup lang="ts">
import ImageComponent from '#build/mdc-image-component.mjs'
import { joinURL, withLeadingSlash, withTrailingSlash } from 'ufo'

export interface UtilImgProps {
	src: string
	width?: string | number
	height?: string | number
	alt?: string
	densities?: string
	mirror?: ImgService
	filter?: string
}

const props = withDefaults(defineProps<UtilImgProps>(), {
	alt: '',
})

const src = computed(() => {
	if (props.src.startsWith('/') && !props.src.startsWith('//')) {
		const _base = withLeadingSlash(withTrailingSlash(useRuntimeConfig().app.baseURL))
		if (_base !== '/' && !props.src.startsWith(_base))
			return joinURL(_base, props.src)
	}
	if (props.mirror)
		return getImgUrl(props.src, props.mirror)
	return props.src
})

// 外链图片无法经由 IPX 处理；调用方显式指定尺寸时也应尊重其选择。
// 正文图可点击放大且灯箱直接复用该元素，故取 2 倍版心宽度，避免放大后模糊。
// 此处刻意使用 width 而非 sizes：sizes 会与全局 densities 冲突，生成非法的 w_1.5 请求。
const autoWidth = computed(() =>
	props.mirror || props.width || props.densities ? undefined : 1344,
)
</script>

<template>
<component
	:is="ImageComponent"
	:src :alt :height :densities
	:width="width ?? autoWidth"
	:format="mirror ? undefined : 'avif,webp'"
	:style="{ filter }"
	:referrerpolicy="mirror ? 'no-referrer' : undefined"
/>
</template>
