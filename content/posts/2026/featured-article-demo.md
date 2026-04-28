---
title: 精选文章功能演示
description: 这是一篇用于演示首页“精选文章”轮播功能的示例文章，只要设置 recommend 字段并提供封面图，就可以在首页顶部展示。
date: 2026-04-28 21:00:00
updated: 2026-04-28 21:00:00
categories: [开发]
tags: [精选, 演示, Blog]
type: tech
image: /assets/Yuki.jpg
recommend: 100
---

## 这篇文章为什么会出现在精选区域

这个项目首页的“精选文章”轮播，数据来源在 `app/pages/index.vue:24`。

它的筛选规则非常直接：

- 文章必须位于 `content/posts/` 目录下
- 文章 frontmatter 中要有 `recommend` 字段
- `recommend` 只要不是空值，就会被筛进精选列表
- 首页会按照 `recommend` 值优先排序，值越大越靠前

也就是说，只要像这篇文章一样加上：

```yaml
image: /assets/Yuki.jpg
recommend: 100
```

刷新首页后，它就应该能在顶部精选区域看到。

## 实际使用时建议这样写

如果主人后面想自己加精选文章，推荐至少保留这些字段：

```yaml
title: 你的文章标题
description: 一句话描述
date: 2026-04-28 21:00:00
categories: [开发]
image: /assets/Yuki.jpg
recommend: 100
```

其中：

- `recommend` 决定是否进入精选，以及排序优先级
- `image` 决定轮播卡片封面，没有图也可能进入，但展示效果会差很多
- `description` 会用于卡片标题和文章摘要相关展示

## 补充说明

还有两个容易忽略的小条件：

1. 精选轮播只会在**首页第一页**显示。
2. 如果当前按分类筛选文章，精选轮播不会显示。

所以如果你加好了文章却没看到，先检查：

- 是不是正在首页 `/`
- 是不是第 1 页
- 有没有选中某个分类
- `recommend` 是否真的写在 frontmatter 里

## 一句话记忆

想让文章出现在首页精选里，最关键的就是：

> 在 `content/posts/` 里新建文章，并在 frontmatter 里设置 `recommend: 数字`，最好再加 `image`。

这样就可以了喵～
