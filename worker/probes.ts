import type {
	ProbeDashboardResponse,
	ProbeMetricTrend,
	ProbeNetworkTrend,
	ProbeServerId,
	ProbeServerSnapshot,
} from '../shared/server-probes'
import { connect } from 'cloudflare:sockets'
import { probeServers } from '../shared/server-probes'
import { applySecurityHeaders } from './security'

const HEARTBEAT_PATH_PATTERN = /^\/api\/probes\/heartbeat\/([a-z0-9-]+)$/
const INVALID_HOSTNAME_PATTERN = /[\s/?#@]/

export interface ProbeEnv {
	DB: D1Database
	PROBE_TARGETS_JSON?: string
	PROBE_TOKENS_JSON?: string
}

interface MetricRow {
	recorded_at: number
	cpu_percent: number
	memory_used_bytes: number
	memory_total_bytes: number
	disk_used_bytes: number
	disk_total_bytes: number
	load_1: number
	uptime_seconds: number
}

interface NetworkRow {
	recorded_at: number
	reachable: number
	latency_ms: number | null
}

interface AgentMetrics {
	cpuPercent: number
	memoryUsedBytes: number
	memoryTotalBytes: number
	diskUsedBytes: number
	diskTotalBytes: number
	load1: number
	uptimeSeconds: number
}

const historyWindowMs = 24 * 60 * 60 * 1000
const retentionWindowMs = 30 * historyWindowMs
const onlineWindowMs = 3 * 60 * 1000
const maxBodyBytes = 2048
const serverIds = new Set<string>(probeServers.map(server => server.id))

function secureJson(body: unknown, status = 200, extraHeaders?: HeadersInit): Response {
	const headers = new Headers(extraHeaders)
	headers.set('Content-Type', 'application/json; charset=utf-8')
	headers.set('Cache-Control', 'no-store')
	applySecurityHeaders(headers)
	return new Response(JSON.stringify(body), { status, headers })
}

function parseObject(value: string | undefined): Record<string, unknown> {
	if (!value)
		return {}

	try {
		const parsed: unknown = JSON.parse(value)
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
			return parsed as Record<string, unknown>
	}
	catch {
		// Secrets are optional in local builds and are configured separately before deployment.
	}

	return {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isNumberInRange(value: unknown, minimum: number, maximum: number): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
}

function safeTokenEqual(actual: string, expected: string): boolean {
	if (actual.length !== expected.length)
		return false

	let mismatch = 0
	for (let index = 0; index < actual.length; index++)
		mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index)

	return mismatch === 0
}

async function readJsonBody(request: Request): Promise<
	{ value: unknown, error: null }
	| { value: null, error: 'too-large' | 'invalid' }
> {
	const contentLength = Number(request.headers.get('Content-Length'))
	if (Number.isFinite(contentLength) && contentLength > maxBodyBytes)
		return { value: null, error: 'too-large' }

	const reader = request.body?.getReader()
	if (!reader)
		return { value: null, error: 'invalid' }

	const chunks: Uint8Array[] = []
	let length = 0

	try {
		while (true) {
			const { done, value } = await reader.read()
			if (done)
				break

			length += value.byteLength
			if (length > maxBodyBytes) {
				await reader.cancel()
				return { value: null, error: 'too-large' }
			}
			chunks.push(value)
		}
	}
	catch {
		return { value: null, error: 'invalid' }
	}
	finally {
		reader.releaseLock()
	}

	try {
		const bytes = new Uint8Array(length)
		let offset = 0
		for (const chunk of chunks) {
			bytes.set(chunk, offset)
			offset += chunk.byteLength
		}
		return { value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown, error: null }
	}
	catch {
		return { value: null, error: 'invalid' }
	}
}

function validateAgentMetrics(value: unknown): AgentMetrics | null {
	if (!isRecord(value))
		return null

	const cpuPercent = value.cpuPercent
	const memoryUsedBytes = value.memoryUsedBytes
	const memoryTotalBytes = value.memoryTotalBytes
	const diskUsedBytes = value.diskUsedBytes
	const diskTotalBytes = value.diskTotalBytes
	const load1 = value.load1
	const uptimeSeconds = value.uptimeSeconds

	if (!isNumberInRange(cpuPercent, 0, 100)
		|| !isIntegerInRange(memoryUsedBytes, 0, Number.MAX_SAFE_INTEGER)
		|| !isIntegerInRange(memoryTotalBytes, 1, Number.MAX_SAFE_INTEGER)
		|| memoryUsedBytes > memoryTotalBytes
		|| !isIntegerInRange(diskUsedBytes, 0, Number.MAX_SAFE_INTEGER)
		|| !isIntegerInRange(diskTotalBytes, 1, Number.MAX_SAFE_INTEGER)
		|| diskUsedBytes > diskTotalBytes
		|| !isNumberInRange(load1, 0, 1_000_000)
		|| !isIntegerInRange(uptimeSeconds, 0, Number.MAX_SAFE_INTEGER)) {
		return null
	}

	return {
		cpuPercent,
		memoryUsedBytes,
		memoryTotalBytes,
		diskUsedBytes,
		diskTotalBytes,
		load1,
		uptimeSeconds,
	}
}

export async function handleProbeApi(request: Request, env: ProbeEnv): Promise<Response> {
	const pathname = new URL(request.url).pathname

	if (pathname === '/api/probes') {
		if (request.method !== 'GET' && request.method !== 'HEAD')
			return secureJson({ error: 'method_not_allowed' }, 405, { Allow: 'GET, HEAD' })

		try {
			const includeHistory = new URL(request.url).searchParams.get('history') !== '0'
			const dashboard = await readDashboard(env, includeHistory)
			return request.method === 'HEAD'
				? new Response(null, { headers: responseHeaders() })
				: secureJson(dashboard)
		}
		catch (error) {
			console.error('Probe dashboard query failed', error)
			return secureJson({ error: 'probe_data_unavailable' }, 503)
		}
	}

	const heartbeatMatch = pathname.match(HEARTBEAT_PATH_PATTERN)
	if (!heartbeatMatch)
		return secureJson({ error: 'not_found' }, 404)
	if (request.method !== 'POST')
		return secureJson({ error: 'method_not_allowed' }, 405, { Allow: 'POST' })
	if (request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json')
		return secureJson({ error: 'unsupported_media_type' }, 415)

	const serverId = heartbeatMatch[1] as ProbeServerId
	if (!serverIds.has(serverId))
		return secureJson({ error: 'not_found' }, 404)

	const tokens = parseObject(env.PROBE_TOKENS_JSON)
	const expectedToken = tokens[serverId]
	const authorization = request.headers.get('Authorization') ?? ''
	const actualToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''

	if (typeof expectedToken !== 'string' || expectedToken.length < 32)
		return secureJson({ error: 'probe_not_configured' }, 503)
	if (!safeTokenEqual(actualToken, expectedToken))
		return secureJson({ error: 'unauthorized' }, 401)

	const body = await readJsonBody(request)
	if (body.error === 'too-large')
		return secureJson({ error: 'payload_too_large' }, 413)
	if (body.error)
		return secureJson({ error: 'invalid_payload' }, 400)

	const metrics = validateAgentMetrics(body.value)
	if (!metrics)
		return secureJson({ error: 'invalid_payload' }, 400)

	try {
		await env.DB.prepare('INSERT INTO probe_metrics (server_id, recorded_at, cpu_percent, memory_used_bytes, memory_total_bytes, disk_used_bytes, disk_total_bytes, load_1, uptime_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
			.bind(
				serverId,
				Date.now(),
				metrics.cpuPercent,
				metrics.memoryUsedBytes,
				metrics.memoryTotalBytes,
				metrics.diskUsedBytes,
				metrics.diskTotalBytes,
				metrics.load1,
				metrics.uptimeSeconds,
			)
			.run()
	}
	catch (error) {
		console.error('Probe heartbeat insert failed', serverId, error)
		return secureJson({ error: 'probe_data_unavailable' }, 503)
	}

	return secureJson({ accepted: true }, 202)
}

function responseHeaders(): Headers {
	const headers = new Headers({ 'Cache-Control': 'no-store' })
	applySecurityHeaders(headers)
	return headers
}

function percent(used: number, total: number): number {
	return total > 0 ? Math.round((used / total) * 1000) / 10 : 0
}

function mapMetricTrend(row: MetricRow): ProbeMetricTrend {
	return {
		at: Number(row.recorded_at),
		cpuPercent: Number(row.cpu_percent),
		memoryPercent: percent(Number(row.memory_used_bytes), Number(row.memory_total_bytes)),
		diskPercent: percent(Number(row.disk_used_bytes), Number(row.disk_total_bytes)),
	}
}

function mapNetworkTrend(row: NetworkRow): ProbeNetworkTrend {
	return {
		at: Number(row.recorded_at),
		reachable: Number(row.reachable) === 1,
		latencyMs: row.latency_ms === null ? null : Number(row.latency_ms),
	}
}

async function readDashboard(env: ProbeEnv, includeHistory: boolean): Promise<ProbeDashboardResponse> {
	const generatedAt = Date.now()
	const since = generatedAt - historyWindowMs

	const servers = await Promise.all(probeServers.map(async (server): Promise<ProbeServerSnapshot> => {
		const [latestMetric, latestNetwork] = await Promise.all([
			env.DB.prepare('SELECT recorded_at, cpu_percent, memory_used_bytes, memory_total_bytes, disk_used_bytes, disk_total_bytes, load_1, uptime_seconds FROM probe_metrics WHERE server_id = ? ORDER BY recorded_at DESC LIMIT 1')
				.bind(server.id)
				.first<MetricRow>(),
			env.DB.prepare('SELECT recorded_at, reachable, latency_ms FROM probe_network WHERE server_id = ? ORDER BY recorded_at DESC LIMIT 1')
				.bind(server.id)
				.first<NetworkRow>(),
		])
		const [metricHistory, networkHistory] = includeHistory
			? await Promise.all([
					env.DB.prepare('SELECT recorded_at, cpu_percent, memory_used_bytes, memory_total_bytes, disk_used_bytes, disk_total_bytes, load_1, uptime_seconds FROM probe_metrics WHERE server_id = ? AND recorded_at >= ? ORDER BY recorded_at ASC LIMIT 1500')
						.bind(server.id, since)
						.all<MetricRow>(),
					env.DB.prepare('SELECT recorded_at, reachable, latency_ms FROM probe_network WHERE server_id = ? AND recorded_at >= ? ORDER BY recorded_at ASC LIMIT 1500')
						.bind(server.id, since)
						.all<NetworkRow>(),
				])
			: [{ results: [] as MetricRow[] }, { results: [] as NetworkRow[] }]

		const latestMetricAt = latestMetric ? Number(latestMetric.recorded_at) : null
		const latestNetworkAt = latestNetwork ? Number(latestNetwork.recorded_at) : null
		const heartbeatIsFresh = latestMetricAt !== null && generatedAt - latestMetricAt <= onlineWindowMs
		const networkIsFresh = latestNetworkAt !== null && generatedAt - latestNetworkAt <= onlineWindowMs
		const online = networkIsFresh && latestNetwork
			? Number(latestNetwork.reachable) === 1
			: heartbeatIsFresh
				? true
				: null

		const metrics = latestMetric
			? {
					cpuPercent: Number(latestMetric.cpu_percent),
					memoryPercent: percent(Number(latestMetric.memory_used_bytes), Number(latestMetric.memory_total_bytes)),
					memoryUsedBytes: Number(latestMetric.memory_used_bytes),
					memoryTotalBytes: Number(latestMetric.memory_total_bytes),
					diskPercent: percent(Number(latestMetric.disk_used_bytes), Number(latestMetric.disk_total_bytes)),
					diskUsedBytes: Number(latestMetric.disk_used_bytes),
					diskTotalBytes: Number(latestMetric.disk_total_bytes),
					load1: Number(latestMetric.load_1),
					uptimeSeconds: Number(latestMetric.uptime_seconds),
				}
			: null

		return {
			id: server.id,
			name: server.name,
			region: server.region,
			online,
			latencyMs: latestNetwork && networkIsFresh && Number(latestNetwork.reachable) === 1
				? (latestNetwork.latency_ms === null ? null : Number(latestNetwork.latency_ms))
				: null,
			lastNetworkCheck: latestNetworkAt,
			lastHeartbeat: latestMetricAt,
			metrics,
			history: {
				metrics: metricHistory.results.map(mapMetricTrend),
				network: networkHistory.results.map(mapNetworkTrend),
			},
		}
	}))

	return { generatedAt, historyHours: 24, servers }
}

interface ProbeTarget {
	hostname: string
	port: number
}

function parseTargets(value: string | undefined): Partial<Record<ProbeServerId, ProbeTarget>> {
	const parsed = parseObject(value)
	const targets: Partial<Record<ProbeServerId, ProbeTarget>> = {}

	for (const server of probeServers) {
		const rawTarget = parsed[server.id]
		if (!isRecord(rawTarget))
			continue

		const hostname = rawTarget.hostname
		const port = rawTarget.port
		if (typeof hostname !== 'string'
			|| !hostname.trim()
			|| hostname.length > 253
			|| INVALID_HOSTNAME_PATTERN.test(hostname)
			|| !isIntegerInRange(port, 1, 65535)) {
			continue
		}

		targets[server.id] = { hostname, port }
	}

	return targets
}

async function checkTcpTarget(target: ProbeTarget): Promise<{ reachable: boolean, latencyMs: number | null }> {
	const startedAt = performance.now()
	let socket: ReturnType<typeof connect> | undefined
	let timer: ReturnType<typeof setTimeout> | undefined

	try {
		socket = connect({ hostname: target.hostname, port: target.port })
		await Promise.race([
			socket.opened,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error('TCP probe timed out')), 5000)
			}),
		])
		return { reachable: true, latencyMs: Math.round((performance.now() - startedAt) * 10) / 10 }
	}
	catch {
		return { reachable: false, latencyMs: null }
	}
	finally {
		if (timer)
			clearTimeout(timer)
		if (socket)
			await socket.close().catch(() => undefined)
	}
}

export async function runNetworkProbes(env: ProbeEnv): Promise<void> {
	const targets = parseTargets(env.PROBE_TARGETS_JSON)

	await Promise.all(probeServers.map(async (server) => {
		const target = targets[server.id]
		if (!target)
			return

		const result = await checkTcpTarget(target)
		try {
			await env.DB.prepare('INSERT INTO probe_network (server_id, recorded_at, reachable, latency_ms) VALUES (?, ?, ?, ?)')
				.bind(server.id, Date.now(), result.reachable ? 1 : 0, result.latencyMs)
				.run()
		}
		catch (error) {
			console.error('Network probe insert failed', server.id, error)
		}
	}))
}

export async function purgeExpiredProbeData(env: ProbeEnv): Promise<void> {
	const cutoff = Date.now() - retentionWindowMs
	await Promise.all([
		env.DB.prepare('DELETE FROM probe_metrics WHERE recorded_at < ?').bind(cutoff).run(),
		env.DB.prepare('DELETE FROM probe_network WHERE recorded_at < ?').bind(cutoff).run(),
	])
}
