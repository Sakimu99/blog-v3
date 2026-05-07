<script setup lang="ts">
const appConfig = useAppConfig()
const announcement = computed(() => appConfig.widget.announcement)

interface AnnouncementItem {
	title?: string
	content: string
}

const items = computed<AnnouncementItem[]>(() => {
	const source = announcement.value.items?.length
		? announcement.value.items
		: announcement.value.content
			? [announcement.value.content]
			: []

	return source.map((item) => {
		if (typeof item === 'string')
			return { content: item }

		return item
	})
})

const isClient = import.meta.client
const currentIndex = ref(0)
const currentItem = computed(() => items.value[currentIndex.value] ?? { content: '' })
const hasMultipleItems = computed(() => items.value.length > 1)
const interval = computed(() => announcement.value.interval ?? 5000)

function showNext() {
	if (!items.value.length)
		return

	currentIndex.value = (currentIndex.value + 1) % items.value.length
}

const { pause, resume } = useIntervalFn(showNext, interval, { immediate: false })

watch(items, (value) => {
	if (!value.length) {
		currentIndex.value = 0
		pause()
		return
	}

	if (currentIndex.value >= value.length)
		currentIndex.value = 0

	if (!isClient) {
		pause()
		return
	}

	if (value.length > 1)
		resume()
	else
		pause()
}, { immediate: true })

watch(interval, () => {
	pause()
	if (isClient && hasMultipleItems.value)
		resume()
})

onBeforeUnmount(pause)
</script>

<template>
<BlogWidget card :title="announcement.title">
	<div
		class="announcement-panel"
		@mouseenter="pause"
		@mouseleave="hasMultipleItems && resume()"
	>
		<Transition name="announcement-switch" mode="out-in">
			<div :key="`${currentIndex}-${currentItem.title || currentItem.content}`" class="announcement-item">
				<p v-if="currentItem.title" class="announcement-subtitle">
					{{ currentItem.title }}
				</p>
				<p class="announcement-content">
					{{ currentItem.content }}
				</p>
			</div>
		</Transition>
	</div>
</BlogWidget>
</template>

<style lang="scss" scoped>
.announcement-panel {
	overflow: hidden;
	min-height: 4.8rem;
}

.announcement-item {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.announcement-subtitle {
	margin: 0;
	font-weight: bold;
	color: var(--c-text-1);
}

.announcement-content {
	overflow-wrap: anywhere;
	margin: 0;
	line-height: 1.8;
	white-space: pre-line;
	color: var(--c-text-2);
}

.announcement-switch-enter-active,
.announcement-switch-leave-active {
	transition: all 0.3s ease;
}

.announcement-switch-enter-from {
	opacity: 0;
	transform: translateY(0.4rem);
}

.announcement-switch-leave-to {
	opacity: 0;
	transform: translateY(-0.4rem);
}
</style>
