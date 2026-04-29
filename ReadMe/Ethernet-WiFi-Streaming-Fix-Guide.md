# Ethernet & WiFi Streaming Fix Guide

## Table of Contents

1. [Overview](#overview)
2. [The Problem](#the-problem)
3. [Diagnosis Steps](#diagnosis-steps)
   - [1. Client-Side Ping Test](#1-client-side-ping-test)
   - [2. WebRTC Stats Panel](#2-webrtc-stats-panel)
   - [3. Client WiFi Check](#3-client-wifi-check)
   - [4. Port Connectivity](#4-port-connectivity)
   - [5. GPU and Container Health](#5-gpu-and-container-health)
   - [6. TURN Server Test](#6-turn-server-test)
   - [7. Network Interface Inspection](#7-network-interface-inspection)
   - [8. WiFi Link Quality](#8-wifi-link-quality)
   - [9. Speed Comparison](#9-speed-comparison)
   - [10. Ethernet Physical Status](#10-ethernet-physical-status)
   - [11. Kernel Logs](#11-kernel-logs)
4. [The Fix](#the-fix)
5. [Persistent Configuration](#persistent-configuration)
6. [WiFi Recovery Procedure](#wifi-recovery-procedure)
7. [Learnings and Considerations](#learnings-and-considerations)
   - [1. Interface-IP Binding Matters](#1-interface-ip-binding-matters)
   - [2. WebRTC is Extremely Sensitive to Network Quality](#2-webrtc-is-extremely-sensitive-to-network-quality)
   - [3. WiFi is Not Suitable for High-Bandwidth Streaming](#3-wifi-is-not-suitable-for-high-bandwidth-streaming)
   - [4. TURN Server Health Depends on Network Interface](#4-turn-server-health-depends-on-network-interface)
   - [5. Dual Ethernet Hosts Need Proper IP Management](#5-dual-ethernet-hosts-need-proper-ip-management)
   - [6. Diagnostic Checklist for Streaming Issues](#6-diagnostic-checklist-for-streaming-issues)
   - [7. Prevention](#7-prevention)

---

## Overview

The LaaS platform runs GPU-accelerated remote desktop sessions (Selkies/WebRTC) inside Docker containers on a host server. Users connect via FortiClient VPN to stream the desktop. The streaming was flawless at 10 mbps / 60 fps until it suddenly degraded to 86% packet loss, 1-second latency, 3 fps, and frequent black screens.

This document chronicles the full diagnosis, fix, and learnings from this network streaming issue that occurred after a host reboot on April 1, 2026.

---

## The Problem

After a host reboot on April 1, 2026:

| Symptom | Details |
|---------|---------|
| Primary ethernet `eno1` | Came up briefly at 1 Gbps, then went DOWN after ~4 minutes |
| Kernel log evidence | "NIC Link is Up" at 04:30:39, "NIC Link is Down" at 04:34:55 |
| `eno1` known issues | PCIe bandwidth limitation (5.0 GT/s x1 link = 4 Gbps available); igc driver on kernel 5.15.0-173 has intermittent link-drop bugs |
| Secondary ethernet `eno2` | Remained UP with DHCP IP 192.168.10.53 (Aquantia, 10GbE capable) |
| Service binding | All LaaS services, Docker containers, and TURN server (coturn) were bound to static IP `192.168.10.92` |
| Manual workaround | Admin added 192.168.10.92 as secondary IP on WiFi interface `wlp8s0` to restore services |
| WiFi status | MediaTek mt7921e running at only 6 Mb/s link rate with TX power limited to 3 dBm due to regulatory domain misconfiguration |
| **Result** | All service traffic (including 8-10 mbps WebRTC video streams) was being pushed through a 6 Mb/s WiFi link instead of gigabit ethernet |

---

## Diagnosis Steps

### 1. Client-Side Ping Test

**Command:**
```powershell
ping -n 20 192.168.10.92
```

**What was checked:** Basic ICMP connectivity from client to host.

**What it revealed:**
- 0% packet loss
- 30ms average latency with spikes to 68ms
- Seemed OK but the jitter was unusual for a local network

> **Note:** This was misleading — ICMP ping showed healthy connectivity while UDP video traffic was experiencing catastrophic loss.

---

### 2. WebRTC Stats Panel

**What was checked:** Selkies WebRTC internal statistics panel (accessible via the streaming UI).

**What it revealed:**

| Metric | Value | Expected |
|--------|-------|----------|
| Packets lost | 7,403 out of 8,572 | < 1% |
| Packet loss rate | **86%** | < 1% |
| Latency | **1,048 ms** | < 50 ms |
| Framerate | **3 fps** | 60 fps |
| Bitrate | **0.05 mbps** | 8 mbps |
| Available bandwidth | 3.50 mbps | > 20 mbps |
| Connection type | "host" (direct) | N/A |

> **Key insight:** The connection was direct (not TURN relay), ruling out TURN misconfiguration as the primary issue.

---

### 3. Client WiFi Check

**Command:**
```powershell
netsh wlan show interfaces
```

**What was checked:** Client-side WiFi adapter status and link quality.

**What it revealed:**
- Adapter: Intel Wi-Fi 6 AX201
- Frequency: 5 GHz
- Link rate: 287 Mbps
- Signal: 94%
- RSSI: -48 dBm

> **Conclusion:** Client side was fine. The issue was on the host/server side.

---

### 4. Port Connectivity

**What was checked:** TCP port reachability for TURN and Selkies services.

**What it revealed:**
- TURN port 3478: Reachable
- Selkies port 8101: Reachable

> **Conclusion:** Services were listening and ports were open — not a firewall issue.

---

### 5. GPU and Container Health

**Commands:**
```bash
nvidia-smi
docker stats --no-stream <container>
docker exec <container> ps aux | grep selkies
```

**What was checked:** GPU encoder health, container resource usage, and process status.

**What it revealed:**
| Component | Status |
|-----------|--------|
| GPU | RTX 4090 at 1% utilization, 50°C, healthy |
| Container CPU | 20% |
| Container RAM | 5 GB / 8 GB |
| Processes | selkies-gstreamer, pipewire-pulse, plasmashell, firefox, VSCode — all running |
| Logs | No errors |

> **Conclusion:** GPU and container were healthy. The issue was not compute-related.

---

### 6. TURN Server Test

**Command:**
```bash
turnutils_uclient -T -u user -w pass 192.168.10.92
```

**What was checked:** TURN server allocation capability.

**What it revealed:**
- Test returned: "Cannot complete Allocation"
- coturn logs showed: Multiple "TCP socket error: Connection reset by peer" from VPN IP 10.212.134.20

> **Key insight:** TURN server was experiencing connection issues, likely due to stale sockets from the interface change.

---

### 7. Network Interface Inspection

**Command:**
```bash
ip -br addr show
```

**What was checked:** IP address to interface mapping.

**What it revealed:**

| Interface | Status | IP Address |
|-----------|--------|------------|
| `eno1` | DOWN | No IP (primary ethernet dead) |
| `eno2` | UP | 192.168.10.53/23 (DHCP) |
| `wlp8s0` | UP | 192.168.10.87/23 (primary) AND 192.168.10.92/23 (secondary) |

> **Critical finding:** All services bound to .92 were running on WiFi! This was the root cause.

---

### 8. WiFi Link Quality

**Command:**
```bash
iwconfig wlp8s0
```

**What was checked:** WiFi link rate and TX power.

**What it revealed:**
- Bit Rate: **6 Mb/s** (minimum rate, not 54+ Mb/s)
- TX-Power: **3 dBm** (extremely low, should be 20+ dBm)

> **Conclusion:** WiFi was operating at minimum capability — the bottleneck for all streaming traffic.

---

### 9. Speed Comparison

**Commands:**
```bash
# Test through default route (ethernet)
curl -o /dev/null -w "%{speed_download}" https://speed.cloudflare.com/__down?bytes=50000000

# Test forced through WiFi
curl --interface wlp8s0 -o /dev/null -w "%{speed_download}" https://speed.cloudflare.com/__down?bytes=50000000
```

**What was checked:** Actual throughput comparison between ethernet and WiFi interfaces.

**What it revealed:**

| Route | Speed | Relative |
|-------|-------|----------|
| Default (ethernet eno2) | 48.5 MB/s (~388 mbps) | Baseline |
| Forced through WiFi | 2.39 MB/s (~19 mbps) | **20x slower** |

> **Conclusion:** WiFi was 20x slower than ethernet — impossible to sustain 8-10 mbps video streams.

---

### 10. Ethernet Physical Status

**Command:**
```bash
sudo ethtool eno2
```

**What was checked:** Physical ethernet link status and speed.

**What it revealed:**
- Speed: 1000 Mb/s (1 Gbps)
- Link detected: yes

> **Conclusion:** The gigabit ethernet interface was working perfectly — services just weren't using it.

---

### 11. Kernel Logs

**Commands:**
```bash
sudo journalctl -k | grep -i eno1
dmesg | grep -i igc
```

**What was checked:** Kernel messages related to ethernet interfaces and drivers.

**What it revealed:**
- `eno1` link drop confirmed at boot time
- igc driver PCIe PTM (Precision Time Measurement) warning
- PCIe bandwidth limitation: 5.0 GT/s x1 link = ~4 Gbps max

> **Conclusion:** `eno1` has a known hardware/driver issue. It cannot be relied upon for production services.

---

## The Fix

Move the service IP from WiFi to the working ethernet interface:

```bash
# Remove .92 from WiFi interface
sudo ip addr del 192.168.10.92/23 dev wlp8s0

# Add .92 to ethernet interface (eno2 which has gigabit link)
sudo ip addr add 192.168.10.92/23 dev eno2

# Restart coturn to clear stale sockets
sudo systemctl restart coturn

# Hard refresh the browser to force new WebRTC negotiation
```

**Result:** Stream returned to flawless 10 mbps / 60 fps immediately.

---

## Additional Issues Found and Fixed

### 1. coturn TURN Relay 403 Forbidden IP

After fixing the IP-to-interface assignment, the TURN relay was still failing with `create permission error 403 (Forbidden IP)`.

**Root Cause:** coturn by default blocks relay to private IP ranges (RFC 6156). The `allowed-peer-ip` config was using dash-range format (`192.168.10.0-192.168.11.255`) which coturn 4.5.2 silently ignores — it requires **CIDR notation**.

**Symptoms:**
- `turnutils_uclient` returns `create permission error 403 (Forbidden IP)` even after allocation succeeds
- WebRTC stream shows "Waiting for stream" or "Connection failed"
- coturn logs show `incoming packet CREATE_PERMISSION processed, error 403: Forbidden IP`

**Fix — use CIDR notation in `/etc/turnserver.conf`:**
```
# Allow local network and Docker bridge subnets as relay peers (CIDR notation)
allowed-peer-ip=192.168.0.0/16
allowed-peer-ip=172.16.0.0/12
allowed-peer-ip=10.0.0.0/8
allow-loopback-peers
```

Then restart: `sudo systemctl restart coturn`

**Important:** The `turnutils_uclient` test tool may STILL show 403 when testing self-relay (relaying to coturn's own external-ip). This is a test-tool limitation, not a real issue. The actual WebRTC flow works because the browser and container negotiate peer IPs (VPN client IP and Docker bridge IP), which are covered by the allowed-peer-ip ranges.

**Verification:** After the fix, coturn logs should show:
```
incoming packet CREATE_PERMISSION processed, success
incoming packet CHANNEL_BIND processed, success
peer 172.31.0.2 lifetime updated: 300
```

### 2. Default Route Through WiFi Instead of Ethernet

Even after moving .92 to eno2, the stream was still laggy because the **default route** was still going through WiFi.

**Diagnosis:**
```bash
$ ip route show default
default via 192.168.10.1 dev wlp8s0          # ← WiFi (no metric = highest priority!)
default via 192.168.10.1 dev eno2 proto dhcp src 192.168.10.53 metric 100

$ ip route get 10.212.134.20
10.212.134.20 via 192.168.10.1 dev wlp8s0 src 192.168.10.87   # ← Reply traffic going through WiFi!
```

**Root Cause:** The WiFi default route had no metric (effectively metric 0), making it the highest priority. All reply traffic to the VPN client was routed through the 6 Mb/s WiFi link instead of the 1 Gbps ethernet.

**Fix:**
```bash
# Remove WiFi default route
sudo ip route del default via 192.168.10.1 dev wlp8s0

# Verify
ip route show default
# Should show only: default via 192.168.10.1 dev eno2 proto dhcp src 192.168.10.53 metric 100

ip route get 10.212.134.20
# Should show: via 192.168.10.1 dev eno2 src 192.168.10.53
```

### 3. Selkies Basic Auth

New sessions are launched with `SELKIES_ENABLE_BASIC_AUTH=true` and a random password. The browser shows "Connection failed" if credentials aren't provided.

**To connect:**
- URL: `http://192.168.10.92:8101`
- Username: `user`
- Password: found via `docker inspect <container-name> --format 'json .Config.Env' | python3 -m json.tool | grep BASIC_AUTH_PASSWORD`

Or embed in URL: `http://user:<password>@192.168.10.92:8101`

### Results After All Fixes

WebRTC stats after routing all traffic through gigabit ethernet:
- Packets lost: **0** (was 7,403 / 86%)
- Latency: **12 ms** (was 1,048 ms)
- Framerate: **60 fps** (was 3 fps)
- Bitrate: **4.85 mbps** (was 0.05 mbps)
- Video encoder: hardware (nvh264enc) ✓
- Peer connection: connected via host (direct) ✓

---

## Persistent Configuration

To make the IP assignment persistent across reboots, configure netplan:

**Option 1: Modify existing netplan config**

Edit `/etc/netplan/*.yaml`:

```yaml
network:
  version: 2
  ethernets:
    eno2:
      dhcp4: true
      addresses:
        - 192.168.10.92/23  # Static service IP on reliable ethernet
```

Apply the configuration:
```bash
sudo netplan apply
```

**Option 2: Systemd-networkd configuration**

Create `/etc/systemd/network/10-eno2.network`:

```ini
[Match]
Name=eno2

[Network]
DHCP=yes
Address=192.168.10.92/23
```

Apply:
```bash
sudo systemctl restart systemd-networkd
```

---

## WiFi Recovery Procedure

The WiFi driver (mt7921e) sometimes gets stuck at minimum rates. Full recovery procedure:

```bash
# Stop network services
sudo killall wpa_supplicant
sudo killall dhclient

# Bring interface down
sudo ip link set wlp8s0 down

# Reload driver module
sudo rmmod mt7921e
sudo modprobe mt7921e

# Bring interface back up
sudo ip link set wlp8s0 up

# Reconnect to WiFi
sudo wpa_supplicant -B -i wlp8s0 -c /etc/wpa_supplicant.conf
sleep 5
sudo dhclient wlp8s0

# Verify
ip addr show wlp8s0
ping 8.8.8.8
```

**Set proper regulatory domain and TX power:**

```bash
# Set regulatory domain (use your country code)
sudo iw reg set IN

# Set TX power to 20 dBm (2000 = 20 dBm in units of 0.01 dBm)
sudo iw dev wlp8s0 set txpower fixed 2000
```

**Verify WiFi link recovery:**
```bash
iwconfig wlp8s0
# Should show Bit Rate > 100 Mb/s and Tx-Power > 15 dBm
```

---

## Learnings and Considerations

### 1. Interface-IP Binding Matters

- **Always verify which physical interface a static IP is assigned to** when manually adding IPs to restore services
- A service IP on WiFi vs ethernet has dramatically different performance characteristics
- Use `ip -br addr show` to quickly audit IP-to-interface mapping
- Document which interface should hold which service IP in your infrastructure documentation

| Interface | Recommended Use |
|-----------|-----------------|
| `eno2` (Aquantia 10GbE) | Service IPs, production traffic |
| `eno1` (Intel igc 2.5GbE) | Avoid — has link-drop bugs |
| `wlp8s0` (WiFi) | Out-of-band management only, not streaming |

---

### 2. WebRTC is Extremely Sensitive to Network Quality

| Ping Result | Actual Traffic | Implication |
|-------------|----------------|-------------|
| 0% loss, 30ms latency | 86% loss, 1s latency | Ping is not a reliable indicator for streaming health |

**Key points:**
- ICMP ping uses small packets with different QoS handling than UDP video traffic
- WebRTC adaptive bitrate ramps down aggressively when detecting packet loss
- WebRTC is very slow to recover even after network conditions improve
- A hard browser refresh forces complete renegotiation and often resolves stale sessions

**Always check the Selkies stats panel for:**
- Packets lost ratio (should be < 1%)
- Latency (should be < 50ms for local network)
- Actual vs set framerate
- Available bandwidth estimate

---

### 3. WiFi is Not Suitable for High-Bandwidth Streaming

| WiFi Link Rate | Max Sustainable Video | Suitable For |
|----------------|----------------------|--------------|
| 6 Mb/s | ~2 mbps (low quality) | Basic remote shell only |
| 54 Mb/s | ~15 mbps | 720p streaming |
| 100+ Mb/s | ~30 mbps | 1080p streaming |
| Wired Ethernet | 100+ mbps | 4K streaming, multiple sessions |

**Key points:**
- WiFi at 6 Mb/s link rate cannot support an 8 mbps video stream
- WiFi half-duplex behavior means upload and download share the same bandwidth
- Even at higher WiFi rates, jitter causes WebRTC packet loss
- WiFi TX power issues (regulatory domain) can cause low link rates

**Recommendation:** Always prefer wired ethernet for host servers running streaming sessions.

---

### 4. TURN Server Health Depends on Network Interface

- coturn's `external-ip` configuration must resolve to a stable, high-bandwidth interface
- When the underlying interface changes, coturn accumulates stale sockets and allocation fails
- After any network interface change, restart coturn:

```bash
sudo systemctl restart coturn
```

- Monitor coturn logs for TCP socket errors:
```bash
sudo journalctl -u coturn -f
```

---

### 5. Dual Ethernet Hosts Need Proper IP Management

This host has two ethernet ports with different characteristics:

| Interface | Driver | Speed | Status |
|-----------|--------|-------|--------|
| `eno1` | Intel igc | 2.5 Gbps (theoretical) | Unreliable — link-drop bug |
| `eno2` | Aquantia | 10 Gbps | Reliable |

**eno1 known issues:**
- igc driver on kernel 5.15.0-173 has intermittent link-drop bugs
- PCIe bandwidth limitation: 5.0 GT/s x1 link = ~4 Gbps actual max
- Link drops within minutes of coming up

**Recommendations:**
- All service IPs should be on `eno2`
- Monitor `eno1` status and consider disabling it to avoid confusion
- Consider upgrading kernel or using a different NIC for `eno1` slot

---

### 6. Diagnostic Checklist for Streaming Issues

Quick-reference checklist for troubleshooting streaming degradation:

| Step | Command | What to Check |
|------|---------|---------------|
| 1 | Selkies UI → Stats Panel | Packet loss %, latency, actual bitrate |
| 2 | `ping -n 20 <host-ip>` | Basic connectivity (but not definitive) |
| 3 | `ip -br addr show` | Which interface has the service IP? |
| 4 | `ip route show default` | Default route (WiFi should NOT be the default) |
| 5 | `iwconfig wlp8s0` | WiFi link rate (should be >100 Mb/s) |
| 6 | `sudo ethtool eno2` | Ethernet link detected? Speed? |
| 7 | `turnutils_uclient -T -u user -w pass <ip>` | TURN allocation working? |
| 8 | `sudo journalctl -u coturn --since "5 min ago" --no-pager \| grep -i "403\|permission\|success"` | coturn permission errors? |
| 9 | `sudo grep allowed-peer-ip /etc/turnserver.conf` | coturn config uses CIDR notation? |
| 10 | `nvidia-smi` | GPU encoder healthy? |
| 11 | `docker stats --no-stream <container>` | Container resource usage |
| 12 | `docker exec <container> ps aux \| grep selkies` | Streaming process running? |
| 13 | `curl --interface <iface> -o /dev/null -w "%{speed_download}" https://speed.cloudflare.com/__down?bytes=5000000` | Interface throughput |

**Decision tree:**
```
Streaming degraded?
├── Check WebRTC stats panel
│   ├── High packet loss? → Network issue
│   └── Low framerate only? → GPU/encode issue
├── If network issue:
│   ├── ip -br addr show → Is service IP on correct interface?
│   ├── ip route show default → Is WiFi the default route?
│   ├── iwconfig → Is WiFi at minimum rate?
│   ├── ethtool → Is ethernet link up?
│   └── journalctl -u coturn → TURN 403 errors? Check allowed-peer-ip CIDR
└── If interface wrong:
    ├── Move IP to correct interface
    ├── Remove WiFi default route if present
    ├── Restart coturn
    └── Hard refresh browser
```

---

### 7. Prevention

**Immediate actions:**

1. **Set up netplan to persistently assign 192.168.10.92 to eno2**
   ```yaml
   # /etc/netplan/99-laas-services.yaml
   network:
     version: 2
     ethernets:
       eno2:
         dhcp4: true
         addresses:
           - 192.168.10.92/23
   ```

2. **Add monitoring alerts for interface state changes**
   ```yaml
   # Example Prometheus alert
   - alert: InterfaceDown
     expr: node_network_up{device=~"eno[12]"} == 0
     for: 1m
     annotations:
       summary: "Network interface {{ $labels.device }} is down"
   ```

3. **Add monitoring alert for WiFi link rate**
   ```yaml
   # Example Prometheus alert
   - alert: WiFiLinkRateLow
     expr: node_wifi_link_rate_mbps < 50
     for: 2m
     annotations:
       summary: "WiFi link rate is {{ $value }} Mb/s (threshold: 50 Mb/s)"
   ```

4. **Create a cron job or systemd timer to verify interface-IP mapping**
   ```bash
   # /usr/local/bin/check-service-ip-interface.sh
   #!/bin/bash
   SERVICE_IP="192.168.10.92"
   EXPECTED_INTERFACE="eno2"
   
   CURRENT_INTERFACE=$(ip -br addr show | grep "$SERVICE_IP" | awk '{print $1}')
   
   if [ "$CURRENT_INTERFACE" != "$EXPECTED_INTERFACE" ]; then
       echo "WARNING: Service IP $SERVICE_IP is on $CURRENT_INTERFACE, expected $EXPECTED_INTERFACE"
       # Optionally: send alert, attempt auto-remediation, or log to monitoring
   fi
   ```

   ```bash
   # Add to crontab (check every 5 minutes)
   */5 * * * * /usr/local/bin/check-service-ip-interface.sh
   ```

5. **Ensure coturn's `/etc/turnserver.conf` has `allowed-peer-ip` in CIDR notation**
   ```bash
   # Verify CIDR notation is used (not dash-range format)
   sudo grep allowed-peer-ip /etc/turnserver.conf
   # Should show: allowed-peer-ip=192.168.0.0/16 (not 192.168.10.0-192.168.11.255)
   ```

6. **After any network change, verify default route goes through ethernet**
   ```bash
   ip route show default
   # Should show eno2 as the default, not wlp8s0
   ```

7. **Make default route persistent in netplan to prevent WiFi from becoming default**
   ```yaml
   # Add to netplan config to ensure ethernet has priority
   network:
     version: 2
     ethernets:
       eno2:
         dhcp4: true
         dhcp4-overrides:
           route-metric: 100  # Lower metric = higher priority
         addresses:
           - 192.168.10.92/23
     wifis:
       wlp8s0:
         dhcp4: true
         dhcp4-overrides:
           route-metric: 200  # Higher metric = lower priority
   ```

8. **Consider disabling eno1 entirely to prevent confusion**
   ```bash
   # Create /etc/netplan/98-disable-eno1.yaml
   network:
     version: 2
     ethernets:
       eno1:
         link-local: []
         optional: true
   ```

---

## Quick Reference Card

| Symptom | Likely Cause | Quick Fix |
|---------|--------------|-----------|
| 86% packet loss, high latency | Service IP on wrong interface | Move IP to ethernet |
| 3 fps, low bitrate | WiFi at 6 Mb/s link rate | Check interface-IP mapping |
| TURN allocation fails | Stale sockets after interface change | Restart coturn |
| TURN 403 Forbidden IP | allowed-peer-ip not in CIDR notation | Use CIDR format in turnserver.conf |
| Reply traffic on WiFi | WiFi default route has priority | Delete WiFi default route |
| eno1 link drops | igc driver bug | Use eno2 instead |
| WiFi stuck at min rate | Driver stuck, regulatory domain | Reload driver, set reg domain |
| "Connection failed" in browser | Basic auth required | Check container env for password |

---

*Document created: April 2026*  
*Related: [FortiClient-VPN-Networking-Guide.md](./FortiClient-VPN-Networking-Guide.md), [Storage-Provisioning-Guide.md](./Storage-Provisioning-Guide.md)*
