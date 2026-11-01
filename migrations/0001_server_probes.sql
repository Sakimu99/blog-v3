CREATE TABLE IF NOT EXISTS probe_metrics (
	server_id TEXT NOT NULL,
	recorded_at INTEGER NOT NULL,
	cpu_percent REAL NOT NULL CHECK (cpu_percent >= 0 AND cpu_percent <= 100),
	memory_used_bytes INTEGER NOT NULL CHECK (memory_used_bytes >= 0),
	memory_total_bytes INTEGER NOT NULL CHECK (memory_total_bytes > 0),
	disk_used_bytes INTEGER NOT NULL CHECK (disk_used_bytes >= 0),
	disk_total_bytes INTEGER NOT NULL CHECK (disk_total_bytes > 0),
	load_1 REAL NOT NULL CHECK (load_1 >= 0),
	uptime_seconds INTEGER NOT NULL CHECK (uptime_seconds >= 0),
	PRIMARY KEY (server_id, recorded_at)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_probe_metrics_time
	ON probe_metrics (recorded_at);

CREATE TABLE IF NOT EXISTS probe_network (
	server_id TEXT NOT NULL,
	recorded_at INTEGER NOT NULL,
	reachable INTEGER NOT NULL CHECK (reachable IN (0, 1)),
	latency_ms REAL,
	PRIMARY KEY (server_id, recorded_at)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_probe_network_time
	ON probe_network (recorded_at);
