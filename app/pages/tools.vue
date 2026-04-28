<script setup lang="ts">
import tools from "~/tools";

const appConfig = useAppConfig();
const layoutStore = useLayoutStore();
layoutStore.setAside([]);

useSeoMeta({
	title: "工具",
	description: `${appConfig.title}整理的常用工具集合，点击卡片可跳转到对应站点。`,
});
</script>

<template>
	<div class="mobile-only">
		<BlogHeader to="/" suffix="工具" tag="h1" />
	</div>

	<section class="tools-page proper-height">
		<header class="tools-header reading-card">
			<h1 class="text-creative">工具箱</h1>
			<p>这里整理了一些顺手的工具，点卡片就可以直接跳过去喵～</p>
		</header>

		<menu class="tools-grid">
			<li v-for="tool in tools" :key="tool.link">
				<LinkCard v-bind="tool" />
			</li>
		</menu>
	</section>
</template>

<style lang="scss" scoped>
.tools-page {
	display: grid;
	gap: 1rem;
	margin: 1rem;

	@media (max-width: $breakpoint-mobile) {
		margin: 0.75rem 0.5rem;
	}
}

.tools-header {
	padding: 1rem 1.2rem;

	> h1 {
		margin-bottom: 0.2em;
		font-size: clamp(2rem, 6vw, 3rem);
	}

	> p {
		opacity: 0.75;
		line-height: 1.7;
	}

	@media (max-width: $breakpoint-mobile) {
		padding: 0.9rem 1rem;
		border-radius: 0.85rem;
	}
}

.tools-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
	gap: 0.75rem;

	@media (max-width: $breakpoint-mobile) {
		grid-template-columns: 1fr;
		gap: 0.6rem;
	}

	> li {
		min-width: 0;
	}

	:deep(.link-card) {
		height: 100%;
		padding: 0.8rem 0.9rem;
	}
}
</style>
