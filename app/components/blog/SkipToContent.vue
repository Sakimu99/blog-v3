<template>
<!-- 若使用 NuxtLink 则键盘焦点不会切换 -->
<a href="#main-content" class="skip-link gradient-card active">
	跳转到主要内容 / Skip to content
</a>
</template>

<style lang="scss" scoped>
.skip-link {
	position: fixed;
	inset-inline-start: 50%;
	top: 1rem;
	width: min(28rem, calc(100vw - 2rem));
	padding: 0.65rem 1rem;
	text-align: center;
	transform: translate(-50%, calc(-100% - 2rem));
	transition: transform 0.2s;
	z-index: calc(infinity);
}

.skip-link:focus,
.skip-link:focus-visible {
	transform: translate(-50%, 0);
}
</style>
