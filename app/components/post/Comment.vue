<script setup lang="ts">
const appConfig = useAppConfig()
const commentEl = useTemplateRef<HTMLDivElement>('comment')

onMounted(() => {
	if (!commentEl.value)
		return

	// Giscus 会根据页面路径加载或创建对应的 GitHub Discussion。
	const { giscus } = appConfig
	const script = document.createElement('script')

	// 仅在客户端动态注入，保持 SSG 产物不依赖评论后端。
	script.src = 'https://giscus.app/client.js'
	script.crossOrigin = 'anonymous'
	script.async = true

	// repoId 与 categoryId 是公开标识，不包含 GitHub Token 等敏感信息。
	Object.entries({
		category: giscus.category,
		categoryId: giscus.categoryId,
		inputPosition: giscus.inputPosition,
		lang: giscus.lang,
		mapping: giscus.mapping,
		reactionsEnabled: giscus.reactionsEnabled,
		repo: giscus.repo,
		repoId: giscus.repoId,
		strict: giscus.strict,
		theme: giscus.theme,
	}).forEach(([key, value]) => script.dataset[key] = value)

	// 清空服务端占位文本，并防止客户端重复挂载 iframe。
	commentEl.value.replaceChildren(script)
})
</script>

<template>
<section id="comments" class="z-comment">
	<h3 class="text-creative">
		评论区
	</h3>

	<div ref="comment" class="giscus">
		<p>评论加载中...</p>
	</div>
</section>
</template>

<style lang="scss" scoped>
.z-comment {
	margin: 3rem 1rem;

	> h3 {
		margin-top: 3rem;
		font-size: 1.25rem;
	}
}

:deep(.giscus) {
	margin-top: 2em;
}

:deep(.giscus-frame) {
	display: block;
	width: 100%;
	border: 0;
}
</style>
