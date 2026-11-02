export const probeServers = [
	{ id: 'oracle-sg-a1', name: '甲骨文云 · 新加坡 · 新加坡', region: '新加坡' },
	{ id: 'us-a', name: 'Advin Services · 美国 · 密苏里州 · 节点 1', region: '美国' },
	{ id: 'us-b', name: 'Advin Services · 美国 · 密苏里州 · 节点 2', region: '美国' },
	{ id: 'aliyun-cn', name: '阿里云 · 中国 · 浙江省', region: '中国大陆' },
	{ id: 'tencent-cn-a', name: '腾讯云 · 中国 · 广东省', region: '中国大陆' },
	{ id: 'tencent-cn-b', name: '腾讯云 · 中国 · 上海市', region: '中国大陆' },
] as const

export type ProbeServerId = typeof probeServers[number]['id']

export interface ProbeMetrics {
	cpuPercent: number
	memoryPercent: number
	memoryUsedBytes: number
	memoryTotalBytes: number
	diskPercent: number
	diskUsedBytes: number
	diskTotalBytes: number
	load1: number
	uptimeSeconds: number
}

export interface ProbeMetricTrend {
	at: number
	cpuPercent: number
	memoryPercent: number
	diskPercent: number
}

export interface ProbeNetworkTrend {
	at: number
	reachable: boolean
	latencyMs: number | null
}

export interface ProbeServerSnapshot {
	id: ProbeServerId
	name: string
	region: string
	online: boolean | null
	latencyMs: number | null
	lastNetworkCheck: number | null
	lastHeartbeat: number | null
	metrics: ProbeMetrics | null
	history: {
		metrics: ProbeMetricTrend[]
		network: ProbeNetworkTrend[]
	}
}

export interface ProbeDashboardResponse {
	generatedAt: number
	historyHours: 24
	servers: ProbeServerSnapshot[]
}
