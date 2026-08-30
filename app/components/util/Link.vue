<script setup lang="ts">
const props = defineProps<{ to?: string }>()

const safeTo = computed(() => getSafeLink(props.to))
</script>

<template>
<a v-if="safeTo?.startsWith('#')" :href="safeTo"><slot /></a>
<a v-else-if="isHttpLink(safeTo)" :href="safeTo" target="_blank" rel="noopener noreferrer"><slot /></a>
<span v-else-if="!safeTo"><slot /></span>
<NuxtLink v-else :to="safeTo" :target="isExtLink(safeTo) ? '_blank' : undefined" rel="noopener noreferrer">
	<slot />
</NuxtLink>
</template>
