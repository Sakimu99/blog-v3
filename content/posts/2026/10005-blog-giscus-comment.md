---
title: 静态博客零后端评论方案:从 Twikoo 迁移到 Giscus 全记录
description: 自建 Twikoo 要维护服务、还会休眠,静态博客能不能拥有"零后端"评论区?答案是 Giscus——把评论存进 GitHub Discussions。记录 blog-v3 的完整接入过程。
date: 2026-08-02 02:30:00
updated: 2026-08-02 02:30:00
image: assets/cover/cover-giscus-comment.png
categories: [开发]
tags: [Giscus, Nuxt, 博客, 评论系统, GitHub]
references:
  - title: Giscus 官网(配置生成器)
    link: https://giscus.app/zh-CN
  - title: giscus 组件源码
    link: https://github.com/giscus/giscus-component
---

### 前言

博客之前的评论系统是 [Twikoo](https://twikoo.js.org/),自部署在 HuggingFace Space 上。用了一段时间,痛点越来越明显:

- **要维护一个活着的服务**:Space 休眠后第一位评论的访客要等冷启动,体验全看运气
- **架构上不匹配**:博客是纯静态站点(Cloudflare Pages),评论区却拖着一个外部后端
- **数据在别处**:评论存在第三方平台上,迁移备份都不顺手

直到重新评估 [Giscus](https://giscus.app/zh-CN),才发现它和静态博客简直是绝配:

::alert{type="tip" title="Giscus 的核心思路" card}
评论直接存进**博客源码仓库的 GitHub Discussions**。不需要数据库、不需要服务端 API、不需要任何环境变量——静态部署的博客天然满足全部条件。
::

### 接入前的三个前提

1. **仓库必须公开**,并且开启 Discussions(仓库 Settings → Features → Discussions)
2. 为仓库安装 [Giscus GitHub App](https://github.com/apps/giscus),**只授权需要接收评论的仓库**,别图省事给全部仓库
3. 访客需要登录 GitHub 才能评论——这是门槛也是过滤,技术博客的读者基本都有账号

### 第一步:在 giscus.app 生成配置

打开 [giscus.app/zh-CN](https://giscus.app/zh-CN),填入仓库名,页面会实时校验是否满足前提。我的选择:

| 配置项 | 值 | 理由 |
| --- | --- | --- |
| 映射方式 | `pathname` + 严格映射 | 每篇文章路径对应一个 Discussion,干净直观 |
| Discussion 分类 | `Announcements` | 该分类只有仓库维护者能开新帖,防止 Discussion 区被灌水 |
| 反应 | 开启 | 不登录也能点个表情,降低互动门槛 |
| 输入框位置 | `bottom` | 先读评论再写评论 |
| 主题 | `light` | 博客已固定亮色主题 |
| 语言 | `zh-CN` | — |

填完后页面底部会生成一段 `<script>` 配置,关键是里面这两个 ID:

::alert{type="info" title="repoId / categoryId 不是凭据"}
`repoId` 和 `categoryId` 是 GitHub 的**公开标识符**,出现在前端产物里没有任何问题。但**千万不要**把 GitHub Personal Access Token 之类的凭据写进配置——Giscus 根本不需要它。
::

### 第二步:写进 blog.config.ts

把配置收敛到 `blog.config.ts`,统一管理:

```ts
/** Giscus 评论配置;所有字段均为公开前端配置 */
giscus: {
	category: 'Announcements',
	categoryId: 'DIC_kwDOSLLDgs4DCd0M',
	inputPosition: 'bottom',
	lang: 'zh-CN',
	mapping: 'pathname',
	reactionsEnabled: '1',
	repo: 'Sakimu99/blog-v3',
	repoId: 'R_kgDOSLLDgg',
	strict: '1',
	theme: 'light',
},
```

### 第三步:重写评论组件

原来的 `Comment.vue` 有 250 多行(Twikoo 初始化 + 链接守卫 + 一大坨样式覆盖),换成 Giscus 后核心逻辑只有一件事:**在客户端动态注入 script**。

```vue
<script setup lang="ts">
const appConfig = useAppConfig()
const commentEl = useTemplateRef<HTMLDivElement>('comment')

onMounted(() => {
	if (!commentEl.value)
		return

	// Giscus 会根据页面路径加载或创建对应的 GitHub Discussion
	const { giscus } = appConfig
	const script = document.createElement('script')

	// 仅在客户端动态注入,保持 SSG 产物不依赖评论后端
	script.src = 'https://giscus.app/client.js'
	script.crossOrigin = 'anonymous'
	script.async = true

	// repoId 与 categoryId 是公开标识,不包含 GitHub Token 等敏感信息
	Object.entries({
		category: giscus.category,
		categoryId: giscus.categoryId,
		// ...其余配置项
	}).forEach(([key, value]) => script.dataset[key] = value)

	// 清空服务端占位文本,并防止客户端重复挂载 iframe
	commentEl.value.replaceChildren(script)
})
</script>

<template>
<section id="comments" class="z-comment">
	<h3 class="text-creative">评论区</h3>
	<div ref="comment" class="giscus">
		<p>评论加载中...</p>
	</div>
</section>
</template>
```

几个值得说的细节:

- **为什么动态注入而不是直接写 `<script>`**:博客是 `nuxt generate` 的纯静态产物,构建期不应该依赖评论服务;`onMounted` 里注入保证只在浏览器端执行
- **`replaceChildren(script)` 的妙用**:一行代码同时完成"清空 SSR 占位文本"和"防止客户端重复挂载 iframe"
- **组件从 250 行瘦到 60 行**:Twikoo 时代的链接守卫弹窗、样式深覆盖全部删掉,Giscus 的 iframe 样式本来就够用

### 第四步:清理 Twikoo 痕迹

换评论系统最容易留尾巴,我清了这四处:

```text
blog.config.ts   → 移除 twikoo.min.js 脚本引用和 twikoo 配置块
app/types/       → 删除 Window.twikoo 的全局类型声明
nuxt.config.ts   → 移除 twikoo 域名的 preconnect
Toc.vue          → 目录锚点从 #twikoo 改成 #comments
```

::alert{type="warning" title="历史评论不会自动迁移"}
Twikoo 里的旧评论存在原服务里,切换到 Giscus 后不会显示。我的博客评论量不大,直接放弃了迁移;如果你的历史评论很珍贵,需要先研究 Twikoo 导出 → Discussions 的映射方案。
::

### 效果

本地 `pnpm dev` 跑起来,文章底部已经是熟悉的 GitHub Discussions 画风:

::pic
---
src: assets/blog_image/10005-01.png
caption: 接入后的评论区,未登录状态显示"使用 GitHub 登录"
---
::

### 结语

这次迁移最爽的点在于**架构自洽**:博客内容是 Git 仓库里的 Markdown,评论是同一个仓库里的 Discussions,静态托管到哪里,评论系统就跟到哪里,没有任何外部状态需要操心。

如果你的博客也是静态托管 + GitHub 托管源码,Giscus 基本是评论系统的标准答案;唯一要掂量的,就是读者必须有 GitHub 账号这件事。

::link-card
---
title: Giscus 官网
description: 在线生成配置,支持多种映射方式和主题
icon: https://giscus.app/favicon.ico
link: https://giscus.app/zh-CN
---
::
