<script setup lang="ts">
const blogLog = [
	{ label: '2026-04-28', value: '今日暂无新的 git 提交' },
	{ label: '2026-04-27', value: '调整友链格式' },
	{ label: '2026-04-27', value: '增加博客背景，补充卡片效果，并兼容搜索功能' },
	{ label: '2026-04-27', value: '调整背景悬浮字体' },
	{ label: '2026-04-27', value: '调整页面底部布局信息，调整友链并初始化部分信息' },
]
</script>

<template>
<BlogWidget card title="更新日志">
	<ZDlGroup size="large" :items="blogLog" />
</BlogWidget>
</template>
