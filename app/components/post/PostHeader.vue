<script setup lang="ts">
import type { ArticleProps } from '~/types/article'

defineOptions({ inheritAttrs: false })
const props = defineProps<ArticleProps>()

const appConfig = useAppConfig()

const coverFilter = computed(() => props.meta?.coverFilter || (props.meta?.coverDim && 'brightness(0.75)') || undefined)
const categoryLabel = computed(() => props.categories?.[0])
const categoryIcon = computed(() => getCategoryIcon(categoryLabel.value))

const shareText = `【${appConfig.title}】${props.title}\n\n${
	props.description ? `${props.description}\n\n` : ''}${
	new URL(props.path!, appConfig.url).href}`

const { copy, copied } = useCopy(shareText)
</script>

<template>
<div class="post-header" :class="{ 'has-cover': image }">
	<Pic v-if="image" class="post-cover" :src="image" :alt="title" :filter="coverFilter" />
	<div class="post-nav">
		<div class="operations">
			<Icon v-show="false" name="tabler:check" />
			<ZButton
				:icon="copied ? 'tabler:check' : 'tabler:share'"
				text="文字分享"
				@click="copy()"
			/>
		</div>

		<div v-if="!meta?.hideInfo" class="post-info">
			<UtilDate
				v-if="date"
				v-tip
				:tip-transform="d => `创建于${d}`"
				:date
				icon="tabler:pencil-minus"
			/>

			<UtilDate
				v-if="updated && isTimeDiffSignificant(date, updated, 1)"
				v-tip
				:tip-transform="d => `修改于${d}`"
				:date="updated"
				icon="tabler:clock-edit"
			/>

			<span v-if="categoryLabel">
				<Icon :name="categoryIcon" />
				{{ categoryLabel }}
			</span>

			<span>
				<Icon name="tabler:pilcrow" />
				{{ formatNumber(readingTime?.words) }} 字
			</span>
		</div>
	</div>

	<h1 class="post-title" :class="getPostTypeClassName(type)">
		{{ title }}
	</h1>
</div>
</template>

<style lang="scss" scoped>
.post-header {
	contain: paint; // overflow hidden + position relative
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: 1rem;
	margin: 0.5rem;
	border-radius: 1rem;
	background-color: var(--c-bg-2);
	color: var(--c-text);

	@media (max-width: $breakpoint-mobile) {
		margin: 0;
		border-radius: 0;

		&.has-cover {
			min-height: 12rem;
			max-height: 16rem;
		}
	}

	&:hover .operations,
	&:focus-within .operations {
		opacity: 1;
	}

	&.has-cover {
		min-height: 16rem;
		max-height: 20rem;
		color: white;
		transition: font-size 0.2s;

		// 封面多为浅色插画（亮度可达 0.9），白字需 50% 以上的黑遮罩才有 4.5:1 对比。
		// 渐层需在文字起始位置前就达到该深度，故第二个色标压到 20%~25%。
		.post-nav {
			background-image: linear-gradient(#000A, #0005 70%, transparent);
		}

		.post-info {
			filter: drop-shadow(0 1px 2px #000);
		}

		.post-title {
			background-image: linear-gradient(transparent, #0009 25%, #000C);
			text-shadow: var(--text-shadow-black);

			&.text-story {
				text-align: center;
			}
		}
	}
}

.operations {
	position: absolute;
	opacity: 0;
	inset-inline-end: 1em;
	color: var(--c-text-1);
	transition: opacity 0.2s;
	z-index: 1;

	@media (max-width: $breakpoint-mobile) {
		opacity: 1;
		inset-block-start: 0.75rem;
		inset-inline-end: 0.75rem;
	}
}

.post-cover {
	position: absolute;
	inset: 0;

	> :deep(img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

.post-title {
	padding: 0.8em 1rem;
	font-size: 1.6em;
	line-height: 1.2;
	z-index: 1;

	@media (max-width: $breakpoint-mobile) {
		padding: 0.7em 0.85rem;
		font-size: 1.35em;
	}
}

.post-nav {
	// 封面为绝对定位，此处需建立定位上下文才不会被盖住
	position: relative;
	padding: 0.8em 1rem;
	font-size: 0.8em;
	z-index: 1;

	@media (max-width: $breakpoint-mobile) {
		padding: 0.7em 0.85rem;
	}

	.post-info {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5em 1.2em;
		column-gap: clamp(1em, 3%, 1.5em);
	}
}
</style>
