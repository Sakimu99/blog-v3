<script setup lang="ts">
defineProps<{
	title?: string
	card?: boolean
	grayscale?: boolean
	dim?: boolean
	bgImg?: string
	bgRight?: boolean
}>()
</script>

<template>
<section class="blog-widget" :class="{ grayscale, dim }">
	<hgroup class="widget-title text-creative">
		<slot name="title">
			{{ title }}
		</slot>
	</hgroup>

	<div class="widget-body" :class="{ 'widget-card': card, 'with-bg': bgImg }">
		<NuxtImg
			v-if="bgImg"
			class="bg-img"
			:class="{ 'bg-right': bgRight }"
			:src="bgImg"
			alt=""
			format="avif,webp"
			:width="360"
			loading="lazy"
		/>
		<slot />
	</div>
</section>
</template>

<style lang="scss" scoped>
.blog-widget {
	font-size: 0.9em;

	.blog-widget + & {
		margin-top: 1rem;
	}

	&.grayscale :where(.iconify, img) {
		transition: filter 0.2s;
		filter: grayscale(0.8);

		#blog-aside:hover &,
		&:focus-within,
		#blog-aside.show & {
			filter: grayscale(0);
		}
	}

	// 原为 opacity: 0.3。祖先透明度必然作用于子孙，会把联系方式等有意义的内容
	// 压到 1.49:1，且 #666 只有在完全不透明时才达标，靠调高数值救不回来。
	// 改用去饱和：静置时同样呈「沉静」观感，但灰色文字本无饱和度，对比不受影响。
	&.dim {
		transition: filter 0.2s;
		filter: saturate(0.5);

		#blog-aside:hover &,
		&:focus-within,
		#blog-aside.show & {
			filter: none;
		}
	}
}

.widget-title {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	margin: 0.5rem;
	color: var(--c-text-2);

	&:empty {
		display: none;
	}

	a {
		transition: color 0.2s;
	}

	> [onclick]:hover, > [href]:hover {
		color: var(--c-primary);
	}
}

.widget-body {
	&.with-bg {
		contain: paint; // overflow hidden + position relative
		z-index: 0;

		> .bg-img {
			position: absolute;
			opacity: 0.2;
			inset: 0;
			width: 100%;
			height: 100%;
			object-fit: cover;
			pointer-events: none;
			z-index: -1;

			&.bg-right {
				inset-inline-start: 50%;
				width: 50%;
				mask-image: linear-gradient(to var(--end), transparent, #FFF 50%);
			}
		}
	}

	&.widget-card {
		padding: 0.5rem 0.8rem;
		border-radius: 0.8rem;
		background-color: var(--c-bg-2);

		:deep(p) {
			padding: 0.2em 0;
		}
	}
}
</style>
