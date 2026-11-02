# 博客服务器探针面板

本功能在博客的 /servers 页面公开展示六台云服务器的别名、在线状态、SSH TCP 延迟、CPU、内存、磁盘和 24 小时趋势。Worker 私下持有目标地址与心跳令牌；公开 API 不返回这些配置。心跳数据保留 30 天。流量机和香港阿里云不纳入监控。

## 组成

- app/pages/servers.vue：博客中的公开状态页面，每分钟刷新。
- worker/index.ts：通过博客域名提供探针 API，并把其他请求代理到 Pages 静态源站。
- worker/probes.ts：校验心跳、读取历史、通过固定私密目标探测 SSH TCP 端口。
- migrations/0001_server_probes.sql：D1 历史表。
- probe-agent/：仅使用 Python 标准库的 Linux 采集端和 systemd 定时器。
- wrangler.jsonc：Worker 路由、D1 绑定和每分钟 Cron。

## 当前部署状态

- 页面已发布到 Cloudflare Pages 项目 `blog-v3`：<https://blog.sakimu.com/servers>。
- `blog-bot-html` Worker 已绑定 `blog.sakimu.com/*`，为页面提供探针 API，并代理普通站点请求到 Pages 源站。
- D1 数据库 `blog-server-probes` 已创建并应用 `0001_server_probes.sql`；数据库 ID 保存在 `wrangler.jsonc`。
- Oracle 新加坡、美国 A、B 与国内腾讯云 A 已安装并启用 `server-probe.timer`，每分钟采集一次。
- 国内阿里云与国内腾讯云 B 已加入公开别名清单及 Worker 的私有 SSH TCP 探测配置；待核验 SSH 主机指纹后安装采集器。
- Worker 每分钟执行 SSH TCP 探测，每天 UTC 02:17 清理 30 天前的数据。
- 面板状态每分钟刷新；展开趋势时才读取 24 小时历史，之后每 30 分钟更新一次，降低公开访问的 D1 行读取量。
- 生产令牌保存在 Cloudflare Worker Secrets 与本机被 Git 忽略的 `.worker.secrets.json` 中；服务器端令牌位于权限为 `0600` 的 `/etc/server-probe.env`。

## 节点 ID

| 页面别名 | ID | 资源采集器 |
| --- | --- | --- |
| 新加坡 A1 | oracle-sg-a1 | 已部署 |
| 美国 A | us-a | 已部署 |
| 美国 B | us-b | 已部署 |
| 国内阿里云 | aliyun-cn | 待核验 SSH 主机指纹 |
| 国内腾讯云 A | tencent-cn-a | 已部署 |
| 国内腾讯云 B | tencent-cn-b | 待核验 SSH 主机指纹 |

ID 是配置键。采集脚本的 PROBE_SERVER_ID、Worker 令牌映射和目标映射必须一致。

## 新环境接入步骤

以下步骤用于迁移到新的 Cloudflare 账号或重建环境。部署 Worker 会接管 `blog.sakimu.com/*` 路由，并将普通网页请求代理到 `PAGES_ORIGIN`。当前生产环境已完成这些步骤，不要在同一账号重复创建数据库。

1. 在新 Cloudflare 账号创建 D1：

    pnpm exec wrangler d1 create blog-server-probes

   把命令返回的数据库 ID 填入 wrangler.jsonc 的 d1_databases[0].database_id。之后应用迁移：

    pnpm exec wrangler d1 migrations apply blog-server-probes --remote

2. 为每台服务器生成独立随机令牌，至少 32 个字符。每个值只放在 Worker 密钥文件和对应服务器的 root-only 环境文件中，不要提交到 Git。

3. 在仓库根目录建立被 Git 忽略的 .worker.secrets.json，填写自己的固定探测目标和令牌映射：

    {
      "PROBE_TARGETS_JSON": "{\"oracle-sg-a1\":{\"hostname\":\"sg-host.example\",\"port\":22},\"us-a\":{\"hostname\":\"us-a.example\",\"port\":22},\"us-b\":{\"hostname\":\"us-b.example\",\"port\":22},\"aliyun-cn\":{\"hostname\":\"aliyun-cn.example\",\"port\":22},\"tencent-cn-a\":{\"hostname\":\"tencent-a.example\",\"port\":22},\"tencent-cn-b\":{\"hostname\":\"tencent-b.example\",\"port\":22}}",
      "PROBE_TOKENS_JSON": "{\"oracle-sg-a1\":\"新加坡节点随机令牌\",\"us-a\":\"美国A节点随机令牌\",\"us-b\":\"美国B节点随机令牌\",\"aliyun-cn\":\"国内阿里云随机令牌\",\"tencent-cn-a\":\"国内腾讯云A随机令牌\",\"tencent-cn-b\":\"国内腾讯云B随机令牌\"}"
    }

   将示例主机名替换成自己的 SSH 主机名。Worker 只读取管理员配置，不接受访客传入主机名或端口。密钥文件不要提交、粘贴到聊天或留在共享目录。

4. 核对 D1 ID、Pages 源站、目标映射和令牌后，单次上传代码和密钥并部署：

    pnpm exec wrangler deploy --secrets-file .worker.secrets.json

   该命令会发布 Worker 版本并接管博客路由。不要用 wrangler secret put 逐个设置首批密钥；该命令会立即部署一个新版本。

5. 将 probe-agent/probe_agent.py、server-probe.service、server-probe.timer 复制到每台 Linux 服务器。安装 Python 文件和 systemd 单元：

    sudo install -d -m 0755 /opt/server-probe
    sudo install -m 0755 probe_agent.py /opt/server-probe/probe_agent.py
    sudo install -m 0644 server-probe.service /etc/systemd/system/server-probe.service
    sudo install -m 0644 server-probe.timer /etc/systemd/system/server-probe.timer

   创建 /etc/server-probe.env，只填当前机器的 ID 和独立令牌：

    PROBE_SERVER_ID=oracle-sg-a1
    PROBE_TOKEN=当前节点的随机令牌
    PROBE_ENDPOINT=https://blog.sakimu.com/api/probes/heartbeat

   各节点分别使用上表 ID（例如新加坡 A1 使用 `oracle-sg-a1`、国内腾讯云 A 使用 `tencent-cn-a`）。环境文件必须归 root 所有且权限为 600，然后启用定时器：

    sudo chown root:root /etc/server-probe.env
    sudo chmod 600 /etc/server-probe.env
    sudo systemctl daemon-reload
    sudo systemctl enable --now server-probe.timer
    sudo systemctl start server-probe.service

   查看采集结果：

    sudo systemctl status server-probe.timer
    sudo journalctl -u server-probe.service -n 20 --no-pager

## 本地开发

1. 复制 .dev.vars.example 为 .dev.vars。示例中的目标和令牌是占位值，真实机器使用自己的私密配置。
2. 创建本地 D1 并应用迁移：

    pnpm exec wrangler d1 migrations apply blog-server-probes --local

3. 在一个终端启动本地 Worker：

    pnpm worker:dev

   Wrangler 默认在 127.0.0.1:8787 提供 Worker 和本地 D1 API。

4. 在另一个终端启动博客：

    pnpm dev

   Nuxt 开发代理会把 /api/probes 转发到本地 Worker。打开 http://127.0.0.1:3000/servers 查看页面；没有心跳记录时，节点会显示等待数据。

## 状态定义

- 在线状态由每分钟 SSH TCP 连接探测决定；三分钟内没有新探测时，才使用新鲜心跳作为在线回退。
- 延迟是 Worker 到目标 SSH TCP 端口建立连接所需时间，不是 ICMP ping，也不表示 Web 服务健康。
- CPU 使用 /proc/stat 的短采样窗口估算；内存取 MemTotal - MemAvailable；磁盘统计根目录。
- 页面不展示 IP、SSH 凭据、探测目标或令牌。
