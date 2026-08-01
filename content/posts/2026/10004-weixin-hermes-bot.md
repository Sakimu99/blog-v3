---
title: 把微信变成家庭运维入口:树莓派部署 Hermes 微信机器人全记录
description: 家里只有 IPv6 公网,没有公网 IPv4,怎么把微信接入自己的运维 Bot?答案是长轮询。记录在树莓派 4B 上部署 Hermes Weixin 网关的完整流程与踩坑。
date: 2026-08-02 01:40:00
updated: 2026-08-02 01:40:00
image: assets/cover/cover-weixin-hermes-bot.png
categories: [技术]
tags: [Hermes, 微信, 树莓派, HomeLab, 运维]
references:
  - title: Hermes Weixin 官方文档
    link: https://hermesagent.org.cn/docs/user-guide/messaging/weixin
  - title: Hermes 安装文档
    link: https://hermesagent.org.cn/docs/getting-started/installation
---

### 前言

家里跑着一堆设备和服务:NAS、软路由、VPS、各种 Docker 容器。我一直想要一个最懒的运维入口——躺在沙发上掏手机,在微信里问一句"NAS 还活着吗",机器人把状态丢回来。

听起来很简单,但有个绕不开的现实问题:

::alert{type="question" title="没有公网 IPv4 怎么办?"}
家里宽带只有 IPv6 公网,传统的 Webhook 方案(微信事件 → 推送到你的服务器)需要入站可达,IPv4-only 的网络环境下根本进不来。
::

翻了一圈方案,最后选了 [Hermes Agent](https://hermesagent.org.cn/) 的微信网关,原因就一个:

::alert{type="tip" title="核心结论" card}
Hermes 的微信适配器基于腾讯 iLink Bot API,走的是**长轮询**——网关主动向外拉消息,不需要公网 IPv4、不需要反向代理、不需要开放任何入站端口,服务器能出网就行。
::

### 部署环境

| 项目 | 值 |
| --- | --- |
| 设备 | 树莓派 4B(aarch64) |
| 系统 | Ubuntu,Python 3.11 |
| 局域网地址 | `192.168.x.x` |
| DDNS | `pi.example.com`(AAAA 记录,仅作管理入口) |
| 公网能力 | IPv6 公网,无公网 IPv4 |

DDNS 域名在这个方案里**不是必需品**,只是留着以后管理面板用。微信消息链路完全不依赖它。

### 开搞:部署全流程

#### 1. 建一个专用用户

机器人 7x24 常驻,别和自己的登录用户混在一起:

:copy{code="sudo adduser --system --group --home /opt/hermes hermes"}

#### 2. 装基础依赖

:copy{code="sudo apt update && sudo apt install -y curl ca-certificates git python3 python3-venv python3-pip ripgrep"}

Node.js 只有浏览器自动化等可选组件才用得到,单纯部署微信网关可以不装。

#### 3. 以服务用户安装 Hermes

先切换到刚创建的 `hermes` 用户,后续安装、扫码和启动都在同一个家目录完成:

```sh wrap
sudo -u hermes -H bash
curl -fsSL https://res1.hermesagent.org.cn/install.sh | bash
source ~/.bashrc
hermes version && hermes doctor
```

<!-- 不要在管理员登录用户下安装；systemd 以 hermes 用户运行时需要读取同一份程序和微信凭据。 -->

安装器会把 Hermes 放到 `~/.hermes/hermes-agent`,命令入口在 `~/.local/bin/hermes`。这里的 `~` 对应 `/opt/hermes`。`hermes doctor` 会体检一遍环境,有缺什么它会直接说。

#### 4. 装微信适配器依赖

依赖必须安装进 **Hermes 自己的虚拟环境**,不能用系统 `python3` 或 `--user`。先解析实际命令位置,再用同一个 venv 的 Python 安装:

```sh
HERMES_BIN="$(readlink -f "$(command -v hermes)")"
HERMES_VENV="$(dirname "$HERMES_BIN")"
"$HERMES_VENV/python" -m pip install aiohttp cryptography qrcode
```

<!-- Hermes 升级后 venv 路径可能变化；每次按命令动态解析，避免把依赖装到系统 Python。 -->

#### 5. 扫码授权

```sh
hermes setup --portal
hermes gateway setup   # 选择 Weixin,按提示扫码
```

手机确认登录后,凭据会落在 `~/.hermes/weixin/accounts/` 下,token 写在 `~/.hermes/.env` 里。此处仍应保持 `hermes` 用户身份。启动网关:

:copy{code="hermes gateway"}

能持续跑起来、不报缺 token 或依赖错误,就说明链路通了。

#### 6. 先上保守策略

刚接通的机器人千万别直接裸奔,我的初始策略写进 `~/.hermes/.env`:

```bash
WEIXIN_DM_POLICY=pairing        # 私聊先走配对授权
WEIXIN_GROUP_POLICY=disabled    # 群消息默认全关
WEIXIN_ALLOW_ALL_USERS=false
```

::alert{type="warning" title="群消息默认关掉"}
群策略一旦误开放,群里任何人 @ 一下就能触发机器人。等私聊跑稳、确认好白名单用户 ID 之后,再考虑把私聊切到 `allowlist`、群聊按需开 `allowlist`。
::

#### 7. systemd 托管

手动 `hermes gateway` 只是验证,常驻还得交给 systemd。写 `/etc/systemd/system/hermes-gateway.service`:

::folding{title="hermes-gateway.service 完整配置"}
```ini
[Unit]
Description=Hermes Agent Gateway
After=network-online.target
Wants=network-online.target
# 连续启动失败时，5 分钟内最多重试 5 次，避免错误配置无限刷日志。
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=hermes
Group=hermes
WorkingDirectory=/opt/hermes
Environment=HOME=/opt/hermes
Environment=PATH=/opt/hermes/.local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/opt/hermes/.local/bin/hermes gateway
Restart=on-failure
RestartSec=20

[Install]
WantedBy=multi-user.target
```
::

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now hermes-gateway.service
journalctl -u hermes-gateway.service -f   # 盯着日志看一会儿
```

### 踩坑记录

::alert{type="error" title="一个 token 只能一个实例"}
同一个微信 token 只允许一个网关实例使用。调试时手动跑了一个 `hermes gateway`,systemd 那个又在跑,两边互相挤掉线。记住:要么手动要么服务,别同时来。
::

- **`errcode=-14`**:会话过期,别慌,停掉服务重新 `hermes gateway setup` 扫码即可。我后来写了个 `/usr/local/sbin/hermes-weixin-login` 辅助脚本,一键重新出二维码、存凭据、拉起服务。
- **依赖装错环境**:`pip install` 装到了系统 Python 而不是 Hermes 的 venv,启动直接报缺包,`hermes doctor` 能查出来。
- **IPv6-only 的副作用**:微信链路没影响(长轮询出站),但如果以后想让 IPv4-only 的设备访问派上的 Web 面板,得套 Cloudflare / FRP / Tailscale 中转,这是后话。

### 效果:在微信里聊两句

部署完之后,日常画风是这样的:

::chat
{.}

NAS 还活着吗

{Hermes}

✅ NAS-Synology 在线,磁盘占用 62%,温度正常

{.}

树莓派自己呢

{Hermes}

负载 0.42,内存剩余 5.1G,网关已运行 6 天 3 小时
::

### 后续规划

机器人接进来只是第一步,和家庭服务管理系统的集成打算分三步走:

::timeline
{第一阶段 · 消息入口}

微信只收管理员私聊命令,命令白名单固定,纯查询:设备状态、服务状态。

{第二阶段 · 只读运维}

管理系统提供本机 API,机器人调 API 拿监控摘要、部署任务状态。

{第三阶段 · 写操作}

允许微信触发部署/重启,但必须有权限校验、危险操作二次确认和审计日志。
::

整体调用边界控制在一条链上:

```text
Weixin Message -> Hermes Gateway -> Command Parser -> HomeServesManagement API -> Executor -> Audit Log
```

### 结语

整套方案最让我觉得舒服的点,就是它对网络环境几乎零要求:一块吃灰的树莓派、一个能出网的宽带,微信就变成了家庭运维的入口。没有内网穿透,没有端口映射,没有证书折腾——长轮询在这种场景下是真的香。

::link-card
---
title: Hermes Weixin 官方文档
description: 部署过程中全程对照的官方文档
icon: https://hermesagent.org.cn/favicon.ico
link: https://hermesagent.org.cn/docs/user-guide/messaging/weixin
---
::
