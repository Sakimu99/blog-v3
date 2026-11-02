#!/usr/bin/env python3
"""Collect a small Linux health snapshot and send it to the blog probe endpoint."""

import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.request

ALLOWED_SERVER_IDS = {
    "oracle-sg-a1",
    "us-a",
    "us-b",
    "aliyun-cn",
    "tencent-cn-a",
    "tencent-cn-b",
}
DEFAULT_ENDPOINT = "https://blog.sakimu.com/api/probes/heartbeat"


def read_cpu_ticks():
    with open("/proc/stat", encoding="ascii") as proc_stat:
        fields = proc_stat.readline().split()
    values = [int(value) for value in fields[1:]]
    idle = values[3] + (values[4] if len(values) > 4 else 0)
    return sum(values[:8]), idle


def cpu_percent():
    before_total, before_idle = read_cpu_ticks()
    time.sleep(0.25)
    after_total, after_idle = read_cpu_ticks()
    total_delta = after_total - before_total
    idle_delta = after_idle - before_idle
    if total_delta <= 0:
        return 0.0
    busy = max(0, total_delta - idle_delta)
    return round(min(100.0, busy * 100.0 / total_delta), 1)


def memory_bytes():
    values = {}
    with open("/proc/meminfo", encoding="ascii") as meminfo:
        for line in meminfo:
            name, value, *_ = line.split()
            if name in {"MemTotal:", "MemAvailable:"}:
                values[name] = int(value) * 1024

    total = values["MemTotal:"]
    available = values["MemAvailable:"]
    return max(0, total - available), total


def load_average():
    try:
        return round(float(os.getloadavg()[0]), 3)
    except (AttributeError, OSError):
        with open("/proc/loadavg", encoding="ascii") as loadavg:
            return round(float(loadavg.read().split()[0]), 3)


def uptime_seconds():
    with open("/proc/uptime", encoding="ascii") as uptime:
        return int(float(uptime.read().split()[0]))


def collect_metrics():
    memory_used, memory_total = memory_bytes()
    disk = shutil.disk_usage("/")
    return {
        "cpuPercent": cpu_percent(),
        "memoryUsedBytes": memory_used,
        "memoryTotalBytes": memory_total,
        "diskUsedBytes": disk.used,
        "diskTotalBytes": disk.total,
        "load1": load_average(),
        "uptimeSeconds": uptime_seconds(),
    }


def send_metrics(server_id, token, endpoint):
    url = endpoint.rstrip("/") + "/" + server_id
    body = json.dumps(collect_metrics(), separators=(",", ":")).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "User-Agent": "blog-server-probe/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        if response.status != 202:
            raise RuntimeError("unexpected response status")


def main():
    server_id = os.environ.get("PROBE_SERVER_ID", "")
    token = os.environ.get("PROBE_TOKEN", "")
    endpoint = os.environ.get("PROBE_ENDPOINT", DEFAULT_ENDPOINT)

    if server_id not in ALLOWED_SERVER_IDS:
        print("PROBE_SERVER_ID is missing or invalid", file=sys.stderr)
        return 2
    if not re.fullmatch(r"[A-Za-z0-9_-]{32,128}", token):
        print("PROBE_TOKEN must be a random token of at least 32 characters", file=sys.stderr)
        return 2
    if not endpoint.startswith("https://"):
        print("PROBE_ENDPOINT must use HTTPS", file=sys.stderr)
        return 2

    try:
        send_metrics(server_id, token, endpoint)
        return 0
    except (OSError, urllib.error.URLError, RuntimeError) as error:
        print("probe upload failed: " + type(error).__name__, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
