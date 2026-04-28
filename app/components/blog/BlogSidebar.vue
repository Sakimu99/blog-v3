<script setup lang="ts">
const appConfig = useAppConfig()
const layoutStore = useLayoutStore()
const searchStore = useSearchStore()

const { text } = useTextSelection()
const debouncedSelection = refDebounced(text)
const searchPreviewText = computed(() => debouncedSelection.value || searchStore.word || '搜索')
</script>

<template>
<BlogMask
	:show="layoutStore.state === 'sidebar'"
	class="mobile-only"
	@click="layoutStore.close()"
/>

<!-- 不能用 Transition 实现弹出收起动画，因为半宽屏状态始终显示 -->
<aside id="blog-sidebar" :class="{ show: layoutStore.state === 'sidebar' }">
	<BlogHeader class="sidebar-header" to="/" />

	<nav class="sidebar-nav scrollcheck-y">
		<div class="search-btn sidebar-nav-item gradient-card" @click="layoutStore.toggle('search')">
			<Icon name="tabler:search" />
			<span class="nav-text">{{ searchPreviewText }}</span>
			<Key class="keycut" code="K" cmd prevent @press="layoutStore.toggle('search')" />
		</div>

		<template v-for="(group, groupIndex) in appConfig.nav" :key="groupIndex">
			<h3 v-if="group.title">
				{{ group.title }}
			</h3>

			<menu>
				<li v-for="(item, itemIndex) in group.items" :key="itemIndex">
					<UtilLink :to="item.url" class="sidebar-nav-item">
						<Icon :name="item.icon" />
						<span class="nav-text">{{ item.text }}</span>
						<Icon v-if="isExtLink(item.url)" class="external-tip" name="tabler:arrow-up-right" />
					</UtilLink>
				</li>
			</menu>
		</template>
	</nav>

	<footer class="sidebar-footer">
		<BlogThemeToggle />
		<ZIconNavList :list="appConfig.footer.iconNav" />
	</footer>
</aside>
</template>

<style lang="scss" scoped>
#blog-sidebar {
	display: flex;
	flex-direction: column;
	min-width: 0;
	color: var(--c-text-2);
	overflow: hidden;

	&:hover {
		color: currentcolor;
	}

	@media (max-width: $breakpoint-mobile) {
		position: fixed;
		inset-inline-start: 0;
		width: 320px;
		max-width: 100%;
		background-color: var(--ld-bg-blur);
		backdrop-filter: blur(0.5rem);
		color: currentcolor;
		transform: var(--transform-start-far);
		transition: transform 0.2s;
		z-index: var(--z-index-popover);

		&.show {
			box-shadow: var(--box-shadow-1), var(--box-shadow-3);
			transform: none;
		}
	}
}

.sidebar-nav {
	flex: 1 1 0;
	min-width: 0;
	padding: 0 5%;
	font-size: 0.9em;
	overflow-x: hidden;

	h3 {
		margin: 2em 0 1em 1em;
		font: inherit;
		color: var(--c-text-2);
	}

	li {
		margin: 0.5em 0;
		min-width: 0;
	}
}

.sidebar-nav-item {
	display: flex;
	align-items: center;
	gap: 0.5em;
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	padding: 0.5em 1em;
	border-radius: 0.5em;
	transition: all 0.2s;

	&:hover,
	&.router-link-active {
		background-color: var(--c-bg-soft);
		color: var(--c-text);
	}

	&.router-link-active::after {
		content: "⦁";
		width: 1em;
		text-align: center;
		color: var(--c-text-3);
	}

	> .iconify {
		flex-shrink: 0;
		font-size: 1.5em;
	}

	> .nav-text {
		display: block;
		flex: 1 1 0;
		width: 0;
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	> .external-tip {
		flex-shrink: 0;
		opacity: 0.5;
		font-size: 1em;
	}
}

.search-btn {
	box-sizing: border-box;
	width: 100%;
	opacity: 0.5;
	min-width: 0;
	margin: 1rem 0;
	outline: 2px solid var(--c-border);
	outline-offset: -2px;
	cursor: text;
	user-select: none;

	&:hover {
		opacity: 1;
		outline-color: transparent;
		background-color: transparent;
	}
}

.sidebar-footer {
	--gap: clamp(0.5rem, 3vh, 1rem);

	display: grid;
	gap: var(--gap);
	padding: var(--gap);
	font-size: 0.8em;
	text-align: center;
	color: var(--c-text-2);
}
</style>
