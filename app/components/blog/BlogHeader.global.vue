<script setup lang="ts">
withDefaults(defineProps<{
	tag?: string
}>(), {
	tag: 'div',
})
const appConfig = useAppConfig()
</script>

<template>
<UtilLink class="blog-header">
	<NuxtImg
		:src="appConfig.header.logo"
		class="blog-logo round-cobblestone"
		:class="{ circle: appConfig.header.showTitle }"
		:alt="appConfig.title"
	/>

	<div v-if="appConfig.header.showTitle" class="blog-text">
		<component :is="tag" class="header-title">
			{{ appConfig.title }}
		</component>

		<div class="header-subtitle">
			{{ appConfig.header.subtitle }}
		</div>
	</div>
</UtilLink>
</template>

<style lang="scss" scoped>
.blog-header {
	contain: layout;
	display: flex;
	align-items: center;
	gap: 0.75em;
	position: relative;
	margin: clamp(1rem, 2rem, 5vh) 1rem min(1rem, 5vh);
	padding: 0.85rem 1rem;
	border: 1px solid var(--c-border);
	border-radius: 1rem;
	line-height: 1.4;
	color: var(--c-text);
	overflow: hidden;
	user-select: none;
	isolation: isolate;
	box-shadow: var(--box-shadow-1);
	background-color: color-mix(in srgb, var(--c-bg) 93%, transparent);
	backdrop-filter: blur(0.18rem);
	transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease, background-color 0.25s ease;

	&::before {
		content: "";
		position: absolute;
		inset: 0;
		background-image: url("/assets/kurisu_back.jpg");
		background-position: 72% center;
		background-repeat: no-repeat;
		background-size: cover;
		opacity: 0.34;
		filter: blur(11px) saturate(0.88) brightness(0.96);
		transform: scale(1.09);
		transition: opacity 0.25s ease, filter 0.25s ease, transform 0.25s ease;
		z-index: -2;
	}

	&::after {
		content: "";
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, color-mix(in srgb, var(--c-bg) 96%, transparent) 0%, color-mix(in srgb, var(--c-bg) 93%, transparent) 34%, color-mix(in srgb, var(--c-bg) 82%, transparent) 62%, color-mix(in srgb, var(--c-bg) 62%, transparent) 100%);
		z-index: -1;
	}

	&:hover {
		border-color: color-mix(in srgb, var(--c-primary) 24%, var(--c-border));
		box-shadow: var(--box-shadow-1), var(--box-shadow-3);
		transform: translateY(-1px);
		background-color: color-mix(in srgb, var(--c-bg) 90%, transparent);

		&::before {
			opacity: 0.82;
			filter: blur(1px) saturate(1.08) brightness(1.02);
			transform: scale(1.015);
		}
	}
}

.blog-logo {
	height: 3em;
	flex-shrink: 0;

	&.circle {
		width: 3em;
		border-radius: 50%;
		box-shadow: var(--box-shadow-1), var(--box-shadow-3);
	}
}

@font-face {
	font-family: AlimamaFangYuanTi;
	src: url("/fonts/AlimamaFangYuanTi.woff2");
}

.blog-text {
	flex: 1 1 auto;
	min-width: 0;
}

.header-title {
	display: block;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	color: var(--c-text);
	font-family: AlimamaFangYuanTi, "Noto Sans SC", sans-serif;
	font-size: 1.5em;
	font-synthesis: none;
	font-variation-settings: "wght" 600, "BEVL" 100;
	line-height: 1.1;
	text-shadow: 0 1px 0 color-mix(in srgb, var(--c-bg) 65%, transparent);
	white-space: nowrap;
}

.header-subtitle {
	max-width: 100%;
	opacity: 0.75;
	font-size: 0.8em;
	overflow: hidden;
	text-overflow: ellipsis;
	text-shadow: 0 1px 0 color-mix(in srgb, var(--c-bg) 55%, transparent);
	white-space: nowrap;
}
</style>
