export const probeServers = [
	{ id: 'oracle-sg-a1', name: '新加坡 A1', region: '新加坡' },
	{ id: 'us-a', name: '美国 A', region: '美国' },
	{ id: 'us-b', name: '美国 B', region: '美国' },
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
