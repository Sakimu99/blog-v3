<script setup lang="ts">
import type {
	ProbeDashboardResponse,
	ProbeMetricTrend,
	ProbeNetworkTrend,
	ProbeServerSnapshot,
} from '~~/shared/server-probes'
import { probeServers } from '~~/shared/server-probes'

const appConfig = useAppConfig()
const layoutStore = useLayoutStore()
layoutStore.setAside([])

useSeoMeta({
	title: '服务器状态',
	description: appConfig.title + '的云服务器状态、资源使用和近 24 小时趋势。',
})

const dashboard = shallowRef<ProbeDashboardResponse | null>(null)
const requestState = ref<'loading' | 'ready' | 'error'>('loading')
const refreshing = ref(false)
const historyLoaded = ref(false)
const historyLoading = ref(false)
let refreshTimer: number | undefined
let historyRefreshCount = 0
let historyRefreshQueued = false
const historyRefreshMinutes = 30

const servers = computed<ProbeServerSnapshot[]>(() => probeServers.map((server) => {
	const snapshot = dashboard.value?.servers.find(item => item.id === server.id)
	return snapshot ?? {
		...server,
		online: null,
		latencyMs: null,
		lastNetworkCheck: null,
		lastHeartbeat: null,
		metrics: null,
		history: { metrics: [], network: [] },
	}
}))

const onlineCount = computed(() => servers.value.filter(server => server.online === true).length)
const offlineCount = computed(() => servers.value.filter(server => server.online === false).length)
const unknownCount = computed(() => servers.value.filter(server => server.online === null).length)
const metricsPendingCount = computed(() => servers.value.filter(server => server.metrics === null).length)

const overallLabel = computed(() => {
	if (requestState.value === 'error')
		return '数据暂不可用'
	if (offlineCount.value > 0)
		return '有节点未响应'
	if (unknownCount.value > 0)
		return '部分节点待接入'
	if (metricsPendingCount.value > 0)
		return '部分采集器待接入'
	return '运行正常'
})

async function refreshDashboard(includeHistory = false) {
	if (refreshing.value) {
		if (includeHistory && !historyLoading.value)
			historyRefreshQueued = true
		return
	}

	refreshing.value = true
	if (includeHistory)
		historyLoading.value = true
	try {
		const endpoint = includeHistory ? '/api/probes' : '/api/probes?history=0'
		const response = await fetch(endpoint, { cache: 'no-store' })
		if (!response.ok)
			throw new Error('监控接口暂不可用')

		const latest = await response.json() as ProbeDashboardResponse
		if (includeHistory || !dashboard.value) {
			dashboard.value = latest
			if (includeHistory)
				historyLoaded.value = true
		}
		else {
			const historyByServer = new Map(dashboard.value.servers.map(server => [server.id, server.history]))
			dashboard.value = {
				...latest,
				servers: latest.servers.map(server => ({
					...server,
					history: historyByServer.get(server.id) ?? server.history,
				})),
			}
		}
		requestState.value = 'ready'
	}
	catch {
		requestState.value = 'error'
	}
	finally {
		refreshing.value = false
		historyLoading.value = false
		if (historyRefreshQueued) {
			historyRefreshQueued = false
			void refreshDashboard(true)
		}
	}
}

onMounted(() => {
	void refreshDashboard()
	refreshTimer = window.setInterval(() => {
		historyRefreshCount++
		void refreshDashboard(historyLoaded.value && historyRefreshCount % historyRefreshMinutes === 0)
	}, 60_000)
})

onBeforeUnmount(() => {
	if (refreshTimer !== undefined)
		window.clearInterval(refreshTimer)
})

function statusLabel(online: boolean | null): string {
	if (online === true)
		return '在线'
	if (online === false)
		return '离线'
	return '等待数据'
}

function formatTime(value: number | null | undefined): string {
	if (!value)
		return '暂无记录'

	return new Intl.DateTimeFormat('zh-CN', {
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	}).format(value)
}

function formatPercent(value: number | null | undefined): string {
	return typeof value === 'number' ? value.toFixed(1) + '%' : '—'
}

function formatBytes(value: number | null | undefined): string {
	if (typeof value !== 'number' || !Number.isFinite(value))
		return '—'

	if (value < 1024)
		return value + ' B'

	const units = ['KiB', 'MiB', 'GiB', 'TiB']
	let scaled = value
	let unitIndex = -1
	while (scaled >= 1024 && unitIndex < units.length - 1) {
		scaled /= 1024
		unitIndex++
	}
	return scaled.toFixed(scaled >= 10 ? 0 : 1) + ' ' + units[unitIndex]
}

function formatDuration(seconds: number | null | undefined): string {
	if (typeof seconds !== 'number' || !Number.isFinite(seconds))
		return '—'

	const days = Math.floor(seconds / 86_400)
	const hours = Math.floor((seconds % 86_400) / 3_600)
	const minutes = Math.floor((seconds % 3_600) / 60)
	if (days > 0)
		return days + ' 天 ' + hours + ' 小时'
	if (hours > 0)
		return hours + ' 小时 ' + minutes + ' 分'
	return minutes + ' 分钟'
}

function progressWidth(value: number | null | undefined): string {
	if (typeof value !== 'number' || !Number.isFinite(value))
		return '0%'
	return Math.min(100, Math.max(0, value)) + '%'
}

type MetricKey = 'cpuPercent' | 'memoryPercent' | 'diskPercent'

function metricPath(history: ProbeMetricTrend[], key: MetricKey): string {
	return linePath(history.map(point => point[key]), 100)
}

function latencyPath(history: ProbeNetworkTrend[]): string {
	const values = history.map(point => point.reachable ? point.latencyMs : null)
	const finiteValues = values.filter((value): value is number => typeof value === 'number')
	const max = Math.max(40, ...finiteValues) * 1.15
	return linePath(values, max, 54)
}

function linePath(values: Array<number | null>, maxValue: number, height = 100): string {
	if (values.length < 2)
		return ''

	const width = 600
	let path = ''
	let connected = false

	values.forEach((value, index) => {
		if (value === null || !Number.isFinite(value)) {
			connected = false
			return
		}
		const x = (index / (values.length - 1)) * width
		const y = height - Math.min(100, Math.max(0, value / maxValue * 100))
		path += (connected ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '
		connected = true
	})

	return path.trim()
}

function trendTimeRange(metrics: ProbeMetricTrend[]): string {
	if (metrics.length === 0)
		return '等待采集数据'
	return formatTime(metrics[0]?.at) + ' — ' + formatTime(metrics.at(-1)?.at)
}

function trendEmptyLabel(count: number): string {
	if (historyLoading.value)
		return '正在读取趋势'
	if (!historyLoaded.value)
		return '展开时读取趋势'
	return count === 0 ? '尚无历史采样' : '正在积累趋势'
}

function networkHistoryEmptyLabel(): string {
	if (historyLoading.value)
		return '正在读取连通记录'
	return historyLoaded.value ? '尚无足够的连通记录' : '展开时读取历史记录'
}

async function refreshNow() {
	await refreshDashboard(true)
}

function onDetailsToggle(event: Event) {
	const details = event.currentTarget as HTMLDetailsElement
	if (details.open && !historyLoaded.value)
		void refreshDashboard(true)
}
</script>

<template>
	<div class="mobile-only">
		<BlogHeader to="/" tag="h1" />
	</div>

	<section class="servers-page proper-height">
		<header class="status-hero reading-card">
			<div class="status-hero__copy">
				<span class="status-eyebrow">NODE OBSERVATORY <span>·</span> 24H</span>
				<h1 class="text-creative">服务器状态</h1>
				<p>把远方的机器，收进一张安静的运行图里。</p>
			</div>

			<div class="status-orbit" :class="{ 'is-down': offlineCount > 0, 'is-waiting': unknownCount === servers.length }">
				<span class="status-orbit__ring" aria-hidden="true" />
				<strong>{{ onlineCount.toString().padStart(2, '0') }}<small> / {{ servers.length.toString().padStart(2, '0') }}</small></strong>
				<span class="status-orbit__label">节点在线</span>
			</div>

			<div class="status-hero__footer">
				<div class="overall-state">
					<span class="state-light" :class="{ 'is-down': offlineCount > 0, 'is-waiting': unknownCount === servers.length || requestState === 'error' }" />
					<strong>{{ overallLabel }}</strong>
					<span>{{ dashboard ? '更新于 ' + formatTime(dashboard.generatedAt) : '等待首次同步' }}</span>
				</div>
				<button
					class="refresh-button"
					type="button"
					:disabled="refreshing"
					@click="refreshNow"
				>
					<Icon name="tabler:refresh" aria-hidden="true" />
					<span>{{ refreshing ? '同步中' : '立即刷新' }}</span>
				</button>
			</div>
		</header>

		<div v-if="requestState === 'error'" class="status-notice reading-card" role="status">
			<Icon name="tabler:cloud-off" aria-hidden="true" />
			<div>
				<strong>监控数据暂不可用</strong>
				<p>稍后会自动重试；如果这是第一次打开，采集服务可能还未完成接入。</p>
			</div>
			<button type="button" @click="refreshNow">
				重试
			</button>
		</div>
		<div v-else-if="requestState === 'loading'" class="status-notice reading-card" role="status">
			<Icon name="tabler:loader-2" class="spin" aria-hidden="true" />
			<div>
				<strong>正在连接监控数据</strong>
				<p>页面每分钟自动同步一次。</p>
			</div>
		</div>

		<div class="status-summary">
			<div class="summary-cell">
				<span class="summary-label">监控节点</span>
				<strong>{{ servers.length }} <small>台</small></strong>
			</div>
			<div class="summary-cell">
				<span class="summary-label">在线</span>
				<strong class="summary-online">{{ onlineCount }} <small>台</small></strong>
			</div>
			<div class="summary-cell">
				<span class="summary-label">未响应</span>
				<strong :class="{ 'summary-down': offlineCount > 0 }">{{ offlineCount }} <small>台</small></strong>
			</div>
			<div class="summary-cell">
				<span class="summary-label">历史窗口</span>
				<strong>24 <small>小时</small></strong>
			</div>
		</div>

		<section class="node-section" aria-labelledby="node-list-title">
			<div class="section-heading">
				<div>
					<span class="section-kicker">YOUR CLOUD, AT A GLANCE</span>
					<h2 id="node-list-title">节点一览</h2>
				</div>
				<span class="auto-refresh">
					<span class="auto-refresh-dot" />
					<span>状态每分钟 · 趋势按需 / 每 30 分钟更新</span>
					<span v-if="metricsPendingCount">· {{ metricsPendingCount }} 台待接采集器</span>
				</span>
			</div>

			<div class="node-grid">
				<article v-for="server in servers" :key="server.id" class="node-card reading-card">
					<header class="node-card__header">
						<div class="node-identity">
							<div class="node-mark" aria-hidden="true">
								<Icon name="tabler:server-2" />
							</div>
							<div>
								<h3>{{ server.name }}</h3>
								<span>{{ server.region }} <span class="node-dot">·</span> Linux</span>
							</div>
						</div>
						<div class="node-status" :class="server.online === true ? 'is-online' : server.online === false ? 'is-offline' : 'is-unknown'">
							<span />
							{{ statusLabel(server.online) }}
						</div>
					</header>

					<div class="node-connection">
						<div>
							<span class="metric-label">SSH TCP 延迟</span>
							<strong>{{ server.latencyMs === null ? '—' : server.latencyMs.toFixed(1) + ' ms' }}</strong>
						</div>
						<div class="connection-note">
							<span class="metric-label">最近探测</span>
							<span>{{ formatTime(server.lastNetworkCheck) }}</span>
						</div>
					</div>

					<div class="resource-grid">
						<div class="resource-cell">
							<div class="resource-topline">
								<span class="resource-name"><i class="resource-dot cpu" />CPU</span>
								<strong>{{ formatPercent(server.metrics?.cpuPercent) }}</strong>
							</div>
							<div class="resource-track"><span class="cpu" :style="{ width: progressWidth(server.metrics?.cpuPercent) }" /></div>
							<span class="resource-detail">1 分钟负载 {{ server.metrics ? server.metrics.load1.toFixed(2) : '—' }}</span>
						</div>
						<div class="resource-cell">
							<div class="resource-topline">
								<span class="resource-name"><i class="resource-dot memory" />内存</span>
								<strong>{{ formatPercent(server.metrics?.memoryPercent) }}</strong>
							</div>
							<div class="resource-track"><span class="memory" :style="{ width: progressWidth(server.metrics?.memoryPercent) }" /></div>
							<span class="resource-detail">{{ formatBytes(server.metrics?.memoryUsedBytes) }} / {{ formatBytes(server.metrics?.memoryTotalBytes) }}</span>
						</div>
						<div class="resource-cell">
							<div class="resource-topline">
								<span class="resource-name"><i class="resource-dot disk" />磁盘</span>
								<strong>{{ formatPercent(server.metrics?.diskPercent) }}</strong>
							</div>
							<div class="resource-track"><span class="disk" :style="{ width: progressWidth(server.metrics?.diskPercent) }" /></div>
							<span class="resource-detail">{{ formatBytes(server.metrics?.diskUsedBytes) }} / {{ formatBytes(server.metrics?.diskTotalBytes) }}</span>
						</div>
					</div>
					<p v-if="!server.metrics" class="metric-pending">
						资源采集器待接入
					</p>

					<details class="node-details" @toggle="onDetailsToggle">
						<summary>
							<span>资源趋势与运行详情</span>
							<span class="node-details-hint">24 小时 <Icon name="tabler:chevron-down" aria-hidden="true" /></span>
						</summary>
						<div class="trend-block">
							<div class="trend-heading">
								<div>
									<h4>资源趋势</h4>
									<span>最近 24 小时</span>
								</div>
								<div class="trend-legend">
									<span><i class="cpu" />CPU</span>
									<span><i class="memory" />内存</span>
									<span><i class="disk" />磁盘</span>
								</div>
							</div>
							<div class="trend-chart">
								<svg viewBox="0 0 600 100" preserveAspectRatio="none" role="img" :aria-label="server.name + ' CPU、内存和磁盘历史趋势'">
									<line x1="0" y1="25" x2="600" y2="25" />
									<line x1="0" y1="50" x2="600" y2="50" />
									<line x1="0" y1="75" x2="600" y2="75" />
									<path class="cpu-line" :d="metricPath(server.history.metrics, 'cpuPercent')" />
									<path class="memory-line" :d="metricPath(server.history.metrics, 'memoryPercent')" />
									<path class="disk-line" :d="metricPath(server.history.metrics, 'diskPercent')" />
								</svg>
								<div v-if="server.history.metrics.length < 2" class="chart-empty">
									<span>{{ trendEmptyLabel(server.history.metrics.length) }}</span>
								</div>
							</div>
							<div class="trend-range">
								<span>24 小时前</span>
								<span>{{ trendTimeRange(server.history.metrics) }}</span>
								<span>现在</span>
							</div>
						</div>

						<div class="node-footer">
							<div>
								<span class="metric-label">系统运行时间</span>
								<strong>{{ formatDuration(server.metrics?.uptimeSeconds) }}</strong>
							</div>
							<div>
								<span class="metric-label">1 分钟负载</span>
								<strong>{{ server.metrics ? server.metrics.load1.toFixed(2) : '—' }}</strong>
							</div>
							<div>
								<span class="metric-label">最近心跳</span>
								<strong>{{ formatTime(server.lastHeartbeat) }}</strong>
							</div>
						</div>

						<div class="network-history">
							<div class="network-history__heading">
								<span>SSH 连通历史</span>
								<strong>{{ server.history.network.length }} <small>次</small></strong>
							</div>
							<div class="network-chart">
								<svg viewBox="0 0 600 54" preserveAspectRatio="none" role="img" :aria-label="server.name + ' SSH 延迟历史趋势'">
									<line x1="0" y1="50" x2="600" y2="50" />
									<path class="latency-line" :d="latencyPath(server.history.network)" />
								</svg>
								<span v-if="server.history.network.length < 2">{{ networkHistoryEmptyLabel() }}</span>
							</div>
						</div>
					</details>
				</article>
			</div>
		</section>

		<footer class="status-footnote">
			<span class="footnote-mark">i</span>
			<span>状态由远程 TCP 探测与服务器定时心跳共同更新。历史数据保留 30 天，图表展示最近 24 小时。</span>
		</footer>
	</section>
</template>

<style lang="scss" scoped>
.servers-page {
	display: grid;
	gap: 1rem;
	padding: 1rem;

	@media (max-width: $breakpoint-mobile) {
		gap: 0.75rem;
		padding: 0.75rem 0.5rem 1rem;
	}
}

.status-hero {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: center;
	gap: 1rem;
	position: relative;
	overflow: hidden;
	min-height: 10rem;
	padding: 1.25rem 1.5rem;
	background:
		radial-gradient(ellipse at 84% 20%, hsl(205deg 90% 76% / 28%), transparent 35%),
		radial-gradient(ellipse at 100% 100%, hsl(253deg 78% 76% / 18%), transparent 40%),
		var(--c-reading-card);

	&::after {
		content: '';
		position: absolute;
		inset: auto 0 0;
		height: 3px;
		background: linear-gradient(90deg, #4c75d8, #71cfc7 48%, #d0b7fb);
		opacity: 0.75;
	}

	@media (max-width: $breakpoint-mobile) {
		min-height: 9rem;
		padding: 1rem 0.9rem 0.85rem;
	}
}

.status-hero__copy {
	position: relative;
	z-index: 1;

	> h1 {
		margin: 0.28rem 0 0.25rem;
		font-size: clamp(2rem, 6vw, 3.2rem);
		letter-spacing: -0.05em;
	}

	> p {
		margin: 0;
		color: var(--c-text-2);
		font-size: 0.95rem;
	}
}

.status-eyebrow, .section-kicker {
	color: var(--c-primary);
	font-size: 0.68rem;
	font-weight: 800;
	letter-spacing: 0.16em;
}

.status-eyebrow > span {
	padding: 0 0.3em;
	color: #60aaa8;
}

.status-orbit {
	display: grid;
	place-items: center;
	position: relative;
	width: 6.25rem;
	aspect-ratio: 1;
	border: 1px solid hsl(218deg 55% 65% / 25%);
	border-radius: 50%;
	background: hsl(0deg 0% 100% / 42%);
	box-shadow: inset 0 0 2rem hsl(209deg 80% 80% / 16%);

	> strong {
		z-index: 1;
		margin-top: 0.25rem;
		color: #314f8d;
		font-size: 1.6rem;
		font-variant-numeric: tabular-nums;
	}

	> strong small {
		color: var(--c-text-3);
		font-size: 0.85rem;
		font-weight: 600;
	}

	&.is-down > strong {
		color: #b34848;
	}

	&.is-waiting > strong {
		color: #777;
	}
}

.status-orbit__ring {
	position: absolute;
	inset: 0.55rem;
	border: 1px dashed hsl(218deg 55% 65% / 36%);
	border-radius: 50%;
	animation: orbit-turn 36s linear infinite;

	&::before {
		content: '';
		position: absolute;
		top: 0.35rem;
		left: 50%;
		width: 0.45rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: #58bcb4;
		box-shadow: 0 0 0 0.25rem hsl(173deg 47% 56% / 15%);
	}
}

.status-orbit__label {
	position: absolute;
	top: calc(50% + 1.1rem);
	color: var(--c-text-2);
	font-size: 0.7rem;
}

.status-hero__footer {
	display: flex;
	grid-column: 1 / -1;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	padding-top: 0.55rem;
	border-top: 1px solid hsl(220deg 24% 70% / 32%);
}

.overall-state {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	min-width: 0;
	font-size: 0.8rem;

	> strong {
		white-space: nowrap;
	}

	> span:last-child {
		overflow: hidden;
		color: var(--c-text-3);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.state-light, .auto-refresh-dot {
	flex: none;
	width: 0.48rem;
	aspect-ratio: 1;
	border-radius: 50%;
	background: #45ae82;
	box-shadow: 0 0 0 0.2rem hsl(147deg 48% 48% / 14%);

	&.is-down {
		background: #d26262;
		box-shadow: 0 0 0 0.2rem hsl(0deg 58% 55% / 13%);
	}

	&.is-waiting {
		background: #c39743;
		box-shadow: 0 0 0 0.2rem hsl(38deg 58% 55% / 13%);
	}
}

.refresh-button, .status-notice > button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.38rem;
	flex: none;
	padding: 0.48rem 0.72rem;
	border: 1px solid hsl(218deg 55% 65% / 35%);
	border-radius: 999px;
	background: hsl(0deg 0% 100% / 62%);
	color: #365b9e;
	font-size: 0.76rem;
	cursor: pointer;
	transition: background 0.2s, transform 0.2s;

	&:hover:not(:disabled) {
		transform: translateY(-1px);
		background: #FFF;
	}

	&:disabled {
		cursor: wait;
		opacity: 0.65;
	}
}

.status-notice {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.8rem 1rem;
	color: var(--c-text-1);

	> :first-child {
		flex: none;
		color: #b5863f;
		font-size: 1.2rem;
	}

	> div {
		flex: 1;
		min-width: 0;
	}

	strong {
		font-size: 0.85rem;
	}

	p {
		margin: 0.15rem 0 0;
		color: var(--c-text-3);
		font-size: 0.75rem;
	}

	@media (max-width: $breakpoint-mobile) {
		align-items: flex-start;
		padding: 0.7rem 0.8rem;
	}
}

.spin {
	animation: orbit-turn 1.3s linear infinite;
}

.status-summary {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	overflow: hidden;
	border: 1px solid var(--c-reading-card-border);
	border-radius: 1rem;
	background: var(--c-reading-card);
	box-shadow: 0 0.35rem 1rem hsl(220deg 30% 50% / 5%);

	@media (max-width: $breakpoint-mobile) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

.summary-cell {
	display: grid;
	gap: 0.22rem;
	padding: 0.8rem 1rem;

	& + & {
		border-left: 1px solid hsl(220deg 20% 74% / 28%);
	}

	&:nth-child(3) {
		@media (max-width: $breakpoint-mobile) {
			border-left: none;
		}
	}

	@media (max-width: $breakpoint-mobile) {
		padding: 0.65rem 0.8rem;

		&:nth-child(n + 3) {
			border-top: 1px solid hsl(220deg 20% 74% / 28%);
		}
	}
}

.summary-label, .metric-label {
	color: var(--c-text-3);
	font-size: 0.68rem;
}

.summary-cell > strong {
	font-size: 1.25rem;
	font-variant-numeric: tabular-nums;

	> small {
		color: var(--c-text-3);
		font-size: 0.7rem;
		font-weight: 500;
	}
}

.summary-online {
	color: #24875d;
}

.summary-down {
	color: #bd4f4f;
}

.node-section {
	display: grid;
	gap: 0.75rem;
}

.section-heading {
	display: flex;
	align-items: end;
	justify-content: space-between;
	gap: 0.75rem;
	padding: 0 0.15rem;

	h2 {
		margin: 0.15rem 0 0;
		font-size: 1.35rem;
		letter-spacing: -0.03em;
	}
}

.section-kicker {
	color: var(--c-text-3);
	font-size: 0.58rem;
	letter-spacing: 0.13em;
}

.auto-refresh {
	display: inline-flex;
	flex: 1 1 auto;
	align-items: center;
	justify-content: flex-end;
	flex-wrap: wrap;
	min-width: 0;
	gap: 0.42rem;
	color: var(--c-text-3);
	font-size: 0.68rem;
	text-align: right;

	.auto-refresh-dot {
		flex: none;
		width: 0.35rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: #5CAF86;
	}
}

.node-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 21rem), 1fr));
	gap: 0.8rem;

	@media (max-width: $breakpoint-mobile) {
		grid-template-columns: 1fr;
	}
}

.node-card {
	display: grid;
	align-content: start;
	gap: 0.65rem;
	min-width: 0;
	padding: 0.75rem;
}

.node-card__header, .node-identity, .node-status, .node-connection, .resource-topline, .trend-heading, .trend-legend, .node-footer, .network-history__heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.6rem;
}

.node-identity {
	justify-content: flex-start;
	min-width: 0;

	h3 {
		margin: 0;
		font-size: 1rem;
	}

	> div:last-child > span {
		color: var(--c-text-3);
		font-size: 0.68rem;
	}
}

.node-mark {
	display: grid;
	place-items: center;
	width: 1.9rem;
	aspect-ratio: 1;
	flex: none;
	border: 1px solid hsl(218deg 45% 75% / 38%);
	border-radius: 0.72rem;
	background: linear-gradient(145deg, hsl(207deg 87% 92%), hsl(248deg 76% 95%));
	color: #4d6eaa;
	font-size: 1.1rem;
}

.node-dot {
	padding: 0 0.2rem;
}

.node-status {
	flex: none;
	justify-content: flex-start;
	gap: 0.38rem;
	padding: 0.25rem 0.48rem;
	border-radius: 999px;
	font-size: 0.68rem;
	font-weight: 700;

	> span {
		width: 0.4rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: currentColor;
	}

	&.is-online {
		background: hsl(150deg 45% 48% / 12%);
		color: #27885e;
	}

	&.is-offline {
		background: hsl(0deg 58% 55% / 11%);
		color: #b44c4c;
	}

	&.is-unknown {
		background: hsl(40deg 65% 50% / 13%);
		color: #96743a;
	}
}

.node-connection {
	padding: 0.45rem 0.58rem;
	border: 1px solid hsl(220deg 22% 77% / 32%);
	border-radius: 0.75rem;
	background: hsl(220deg 30% 98% / 65%);
}

.node-connection > div, .node-footer > div {
	display: grid;
	gap: 0.18rem;
	min-width: 0;
}

.node-connection strong {
	color: #355a99;
	font-size: 1.08rem;
	font-variant-numeric: tabular-nums;
}

.connection-note {
	text-align: right;
	color: var(--c-text-2);
	font-size: 0.7rem;
}

.resource-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.55rem;
}

.resource-cell {
	display: grid;
	gap: 0.28rem;
	min-width: 0;
}

.resource-topline {
	font-size: 0.76rem;
	font-variant-numeric: tabular-nums;

	> strong {
		font-weight: 700;
	}
}

.resource-name {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
}

.resource-dot, .trend-legend i {
	width: 0.45rem;
	aspect-ratio: 1;
	border-radius: 50%;
	background: #5d82d3;
}

.cpu {
	background: #587ed1;
}

.memory {
	background: #54aaa2;
}

.disk {
	background: #ac80d6;
}

.resource-track {
	overflow: hidden;
	height: 0.34rem;
	border-radius: 999px;
	background: hsl(220deg 24% 74% / 24%);

	> span {
		display: block;
		height: 100%;
		border-radius: inherit;
		transition: width 0.45s ease;
	}
}

.resource-detail {
	display: block;
	min-height: 0.72rem;
	overflow: hidden;
	color: var(--c-text-3);
	font-size: 0.56rem;
	font-variant-numeric: tabular-nums;
	line-height: 0.72rem;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.metric-pending {
	margin: -0.25rem 0 0;
	color: var(--c-text-3);
	font-size: 0.62rem;
}

.node-details {
	min-width: 0;
	border-top: 1px solid hsl(220deg 22% 77% / 30%);

	> summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding-top: 0.55rem;
		color: var(--c-text-2);
		font-size: 0.68rem;
		font-weight: 650;
		cursor: pointer;
		list-style: none;
		user-select: none;

		&::-webkit-details-marker {
			display: none;
		}
	}

	&[open] > summary {
		padding-bottom: 0.1rem;
	}
}

.node-details-hint {
	display: inline-flex;
	align-items: center;
	gap: 0.28rem;
	color: var(--c-text-3);
	font-size: 0.6rem;
	font-weight: 500;

	:deep(svg) {
		transition: transform 0.18s ease;
	}

	.node-details[open] & :deep(svg) {
		transform: rotate(180deg);
	}
}

.trend-block {
	display: grid;
	gap: 0.35rem;
	padding-top: 0.55rem;
}

.trend-heading {
	align-items: end;

	h4 {
		margin: 0;
		font-size: 0.78rem;
	}

	> div:first-child > span {
		color: var(--c-text-3);
		font-size: 0.62rem;
	}
}

.trend-legend {
	justify-content: flex-end;
	gap: 0.55rem;
	color: var(--c-text-2);
	font-size: 0.6rem;

	span {
		display: inline-flex;
		align-items: center;
		gap: 0.22rem;
	}

	i {
		width: 0.35rem;
	}
}

.trend-chart {
	position: relative;
	height: 5.3rem;
	border-radius: 0.55rem;
	background: linear-gradient(180deg, hsl(214deg 75% 95% / 62%), hsl(214deg 75% 99% / 28%));

	svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	line {
		stroke: hsl(220deg 22% 74% / 34%);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}

	path {
		fill: none;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.cpu-line {
		stroke: #587ed1;
	}

	.memory-line {
		stroke: #54aaa2;
	}

	.disk-line {
		stroke: #ac80d6;
	}
}

.chart-empty {
	display: grid;
	place-items: center;
	position: absolute;
	inset: 0;
	color: var(--c-text-3);
	font-size: 0.7rem;
	pointer-events: none;
}

.trend-range {
	display: flex;
	justify-content: space-between;
	gap: 0.4rem;
	color: var(--c-text-3);
	font-size: 0.58rem;

	> span:nth-child(2) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.node-footer {
	align-items: stretch;
	gap: 0.5rem;
	padding-top: 0.5rem;
	border-top: 1px solid hsl(220deg 22% 77% / 30%);

	> div {
		flex: 1;
	}

	strong {
		font-size: 0.73rem;
		font-variant-numeric: tabular-nums;
	}
}

.network-history {
	display: grid;
	gap: 0.3rem;
	padding-top: 0.5rem;
	border-top: 1px solid hsl(220deg 22% 77% / 30%);
}

.network-history__heading {
	font-size: 0.68rem;
	color: var(--c-text-2);

	> strong {
		font-variant-numeric: tabular-nums;
	}

	small {
		color: var(--c-text-3);
		font-weight: 500;
	}
}

.network-chart {
	position: relative;
	height: 2.7rem;
	border-radius: 0.45rem;
	background: hsl(173deg 42% 94% / 55%);

	svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	line {
		stroke: hsl(220deg 22% 74% / 34%);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}

	path {
		fill: none;
		stroke: #4da99c;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	> span {
		display: grid;
		place-items: center;
		position: absolute;
		inset: 0;
		color: var(--c-text-3);
		font-size: 0.63rem;
	}
}

.status-footnote {
	display: flex;
	align-items: flex-start;
	gap: 0.48rem;
	padding: 0.1rem 0.2rem 0.5rem;
	color: var(--c-text-3);
	font-size: 0.67rem;
	line-height: 1.6;
}

.footnote-mark {
	display: grid;
	place-items: center;
	width: 1rem;
	aspect-ratio: 1;
	flex: none;
	border: 1px solid currentColor;
	border-radius: 50%;
	font-size: 0.62rem;
	font-weight: 700;
}

@keyframes orbit-turn {
	to {
		transform: rotate(360deg);
	}
}

@media (prefers-reduced-motion: reduce) {
	.status-orbit__ring, .spin {
		animation: none;
	}

	.refresh-button, .resource-track > span {
		transition: none;
	}
}
</style>
