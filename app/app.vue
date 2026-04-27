<template>
	<NuxtLoadingIndicator />
	<NuxtRouteAnnouncer :style="{ position: 'absolute' }" />
	<div class="site-scene" aria-hidden="true">
		<div class="site-scene__image" />
		<div class="site-scene__veil" />
	</div>
	<div id="layout-shell">
		<BlogSidebar />
		<div id="content">
			<main id="main-content">
				<NuxtPage />
				<BlogFooter />
			</main>
			<BlogAside />
		</div>
	</div>
	<BlogPanel />
	<div id="modals-host">
			<BikariyaModals />
		</div>
</template>

<!-- eslint-disable-next-line vue/enforce-style-attribute -->
<style lang="scss">
#blog-root {
	position: relative;
	min-width: 0;
	min-height: 100vh;
	min-height: 100dvh;
	background-color: var(--c-scene-base);
	isolation: isolate;

	> :not(.site-scene):not(#modals-host) {
		position: relative;
		z-index: 1;
	}
}

#modals-host {
	position: static;
	z-index: auto;
}

#layout-shell {
	display: flex;
	justify-content: center;
	gap: 1rem;
	width: fit-content;
	max-width: 100%;
	min-width: 0;
	margin: 0 auto;
}

.site-scene {
	position: fixed;
	inset: 0;
	overflow: hidden;
	pointer-events: none;
	z-index: 0;

	> * {
		position: absolute;
		inset: 0;
	}

	&__image {
		background:
			linear-gradient(var(--c-scene-mask), var(--c-scene-mask)),
			var(--site-bg-image) center / cover no-repeat;
		transform: scale(1.02);
		filter: blur(6px) saturate(1.08);
	}

	&__veil {
		background:
			radial-gradient(circle at top left, transparent 0 18%, var(--c-scene-mist) 72%),
			radial-gradient(circle at bottom right, transparent 0 24%, var(--c-scene-mist) 82%),
			linear-gradient(180deg, var(--c-scene-mist), transparent 24%, transparent 76%, var(--c-scene-mist));
	}
}

#blog-sidebar, #blog-aside {
	flex: 0 0 280px; // 防止搜索框 grow
	position: sticky;
	top: 0;
	height: 100vh;
	height: 100dvh;
	min-width: 0; // 防止搜索框撑开页面
	scrollbar-width: thin;

	@media (max-width: $breakpoint-widescreen) {
		flex-shrink: 0.2;
	}
}

@media not (max-width: $breakpoint-widescreen) {
	#blog-sidebar, #blog-aside {
		border: 1px solid var(--c-reading-shell-border);
		border-radius: 1.25rem;
		background-color: var(--c-reading-soft);
		box-shadow: var(--box-shadow-2);
		backdrop-filter: blur(18px) saturate(1.2);
	}
}

#content {
	display: flex;
	align-items: stretch;
	gap: 1rem;

	// 若设置的是 max-width，则内部 main 宽度为 fit-content，可能无法撑满
	// 此时即使设置 flex-grow，也会影响 #sidebar 无法正确 shrink
	width: $breakpoint-widescreen;
	min-width: 0; // 解决父级 flexbox 设置 justify-content: center 时溢出左侧消失的问题

	// 此处不建议给内容设置 padding
	> #main-content {
		position: relative;
		display: flex;
		flex-direction: column;
		flex-grow: 1; // 使较小宽度的内容占满
		min-height: 100vh;
		min-height: 100dvh;
		min-width: 0;
		padding: 0.65rem 0 0.35rem;
		border: 1px solid var(--c-reading-shell-border);
		border-radius: 1.5rem;
		background-color: var(--c-reading-shell);
		box-shadow: 0 1.25rem 3rem var(--c-reading-shadow);
		backdrop-filter: blur(20px) saturate(1.25);

		// overflow: hidden; // 会使一部分元素吸顶失效

		// 使内容正确计算宽度而不横向溢出
		// 也可设置 width: 0 或者 contain: inline-size（兼容性不佳）
	}
}

@media (max-width: $breakpoint-widescreen) {
	#layout-shell {
		width: 100%;
	}

	#content > #main-content {
		padding-top: 0.45rem;
		border-radius: 1.15rem;
	}
}

@media (max-width: $breakpoint-mobile) {
	#layout-shell {
		display: block;
	}

	#content > #main-content {
		padding: 0;
		border: none;
		border-radius: 0;
		background-color: transparent;
		box-shadow: none;
		backdrop-filter: none;
	}
}
</style>
