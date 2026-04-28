<template>
	<BlogWidget
		card
		dim
		title="联系我/我们"
		bg-img="https://p.qlogo.cn/gh/1060233598/1060233598/100/"
		bg-right
	>
		<div class="title text-creative">讨论群</div>

		<Tip copy icon :tip-options="{ placement: 'left' }">
			<Icon name="ri:qq-fill" />1060233598
		</Tip>
	</BlogWidget>

	<BlogWidget card dim bg-img="https://www.bilibili.com/favicon.ico" bg-right>
		<UtilLink class="community-link" to="https://space.bilibili.com/23045581">
			<div class="title text-creative">Bilibili</div>
			<div class="tip"><Icon name="ri:bilibili-fill" />23045581</div>
		</UtilLink>
	</BlogWidget>
</template>

<style lang="scss" scoped>
.title {
	background-clip: text;
	background-image: linear-gradient(
		60deg,
		var(--c-accent) -30%,
		var(--c-primary),
		var(--c-text-1)
	);
	background-position: 100% 0;
	background-size: 200%;
	font-size: 1.8em;
	color: transparent;
	transition: background-position 0.2s;

	.blog-widget:hover & {
		background-position: 0 0;
	}
}

.community-link {
	display: block;
	color: inherit;
}

.tip {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	font-size: 0.9em;
	line-height: 2;
}

.external-tip {
	opacity: 0.6;
	margin-inline-start: auto;
	font-size: 1em;
}

:deep(.bg-img).bg-img.bg-img {
	opacity: 0.5;
}
</style>
