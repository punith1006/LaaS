# FortiClient VPN Networking Guide

> **Purpose**: This document captures key learnings, diagnostics, and fixes from networking troubleshooting during the migration from Tailscale to FortiClient VPN. Use this as a reference guide for the team.

---

## Table of Contents

1. [Network Architecture Overview](#1-network-architecture-overview)
2. [Storage Service vs Desktop Stream Network Paths](#2-key-learning-storage-service-vs-desktop-stream-network-paths)
3. [DOCKER-USER iptables Chain and Container Isolation](#3-key-learning-docker-user-iptables-chain-and-container-isolation)
4. [Selkies TURN Server Configuration](#4-key-learning-selkies-turn-server-configuration)
5. [IP Migration Checklist](#5-ip-migration-checklist-tailscale--forticlient)
6. [Diagnostic Commands Reference](#6-diagnostic-commands-reference)
7. [Tailscale vs FortiClient VPN Comparison](#7-tailscale-vs-forticlient-vpn-comparison)
8. [Docker Restart After iptables Flush](#8-docker-restart-after-iptables-flush)

---

## 1. Network Architecture Overview

### Topology

```
┌─────────────────┐         FortiClient VPN          ┌─────────────────────────────┐
│   Dev Machine   │ ═════════════════════════════════▶│      Host (192.168.10.92)   │
│                 │         Tunnel: 10.212.134.x      │                             │
│  - Browser      │                                    │  Docker Networks:           │
│  - Frontend     │                                    │  - 172.30.0.0/16 (monitor)  │
│  - Backend      │                                    │  - 172.31.0.0/16 (sessions) │
└─────────────────┘                                    │                             │
                                                       │  Services:                  │
                                                       │  - Session Desktops (8101+) │
                                                       │  - Grafana (3000)           │
                                                       │  - Prometheus (9090)        │
                                                       │  - Flask:9998 (orchestrate) │
                                                       │  - Flask:9999 (storage)     │
                                                       └─────────────────────────────┘
```

### Key Components

| Component | Network | Port Range | Purpose |
|-----------|---------|------------|---------|
| Session Desktops (Selkies EGL) | 172.31.0.0/16 | 8101-8199 | WebRTC streaming |
| Monitoring Stack | 172.30.0.0/16 | 3000, 9090, etc. | Grafana, Prometheus |
| Session Orchestration | Host | 9998 | Flask API for session management |
| Storage Provision | Host | 9999 | Flask API for file storage |

### VPN Connection Details

- **VPN Type**: FortiNet Remote Access (SSL VPN)
- **Client IP Range**: 10.212.134.x (assigned by FortiGate)
- **Target Host**: 192.168.10.92
- **Routing**: All traffic to 192.168.10.0/24 goes through VPN tunnel

---

## 2. Key Learning: Storage Service vs Desktop Stream Network Paths

### The Observation

When migrating from Tailscale to FortiClient, **storage uploads worked immediately**, but **desktop streaming failed**. This was confusing because both seemed to connect to the same host.

### Root Cause: Different Network Paths

#### Storage Upload Path (Works via Backend Proxy)

```
Browser                Frontend              Backend               Flask (Host)
   │                      │                    │                      │
   │  Upload file         │                    │                      │
   │─────────────────────▶│                    │                      │
   │                      │  API request       │                      │
   │                      │───────────────────▶│                      │
   │                      │                    │  Proxy to :9999      │
   │                      │                    │─────────────────────▶│
   │                      │                    │                      │
   │                      │                    │  ← Response          │
   │                      │  ← Response        │                      │
   │  ← Success           │                    │                      │
```

**Key Insight**: The browser never directly connects to the host. The NestJS backend proxies all storage requests to `192.168.10.92:9999`. The backend has a stable network path (either local or via VPN), so this works regardless of VPN type.

#### Desktop Stream Path (Requires Direct Browser Connection)

```
Browser                              Selkies Container (Host)
   │                                         │
   │  WebRTC Signaling (via backend)         │
   │────────────────────────────────────────▶│
   │                                         │
   │  Direct WebRTC Media Connection         │
   │  http://192.168.10.92:8101/             │
   │════════════════════════════════════════▶│
   │         ↑ MUST GO THROUGH VPN           │
   │                                         │
```

**Key Insight**: WebRTC requires the browser to connect **directly** to the streaming endpoint (`http://192.168.10.92:8101/`). This connection goes through the VPN tunnel and is affected by firewall rules.

### Architectural Implications

| Feature | Network Path | VPN Dependency | Failure Mode |
|---------|-------------|----------------|--------------|
| File Upload | Browser → Backend → Host | Backend connectivity only | Backend unreachable |
| Desktop Stream | Browser → Host (direct) | VPN routing + firewall | iptables blocks response |
| Grafana Access | Browser → Host (direct) | VPN routing only | Port not accessible |

---

## 3. Key Learning: DOCKER-USER iptables Chain and Container Isolation

### Background: LaaS Security Model

LaaS uses iptables rules in the `DOCKER-USER` chain to prevent containers from accessing private networks. This is a security isolation measure.

### The Rules

```bash
# Example of LaaS DOCKER-USER rules
sudo iptables -L DOCKER-USER -n -v

# Output (simplified):
Chain DOCKER-USER (1 references)
 pkts bytes target     prot opt in     out     source               destination
  100  8000 DROP       all  --  *      *       172.31.0.0/16        10.0.0.0/8
   50  4000 DROP       all  --  *      *       172.31.0.0/16        192.168.0.0/16
   30  2400 DROP       all  --  *      *       172.31.0.0/16        172.16.0.0/12
   20  1600 DROP       all  --  *      *       172.31.0.0/16        100.64.0.0/10
   10   800 DROP       all  --  *      *       172.31.0.0/16        169.254.0.0/16
```

### The Problem: Response Packets Dropped

```
┌─────────────────┐                    ┌─────────────────┐
│  VPN Client     │                    │  Container      │
│  10.212.134.5   │                    │  172.31.0.10    │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │  1. SYN (dst:172.31.0.10:8101)       │
         │═════════════════════════════════════▶│  ← Allowed (incoming)
         │                                      │
         │  2. SYN-ACK (src:172.31.0.10         │
         │               dst:10.212.134.5)      │
         │◀═════════════════════════════════════│
         │         ↑                            │
         │    MATCHES DROP RULE!                │
         │    172.31.0.0/16 → 10.0.0.0/8        │
         │         ↓                            │
         │    PACKET DROPPED                    │
         │                                      │
```

**Why this happens**:
1. VPN client IP `10.212.134.x` falls within `10.0.0.0/8` range
2. Session container IP `172.31.x.x` falls within `172.31.0.0/16` source range
3. Container's response packet (src=172.31.x, dst=10.212.x) matches DROP rule
4. Connection fails — browser never receives response

### Why Grafana Worked

| Service | Docker Network | Matches DROP Source? | Result |
|---------|---------------|---------------------|--------|
| Grafana (3000) | 172.30.0.0/16 | ❌ No (172.30 ≠ 172.31) | ✅ Works |
| Prometheus (9090) | 172.30.0.0/16 | ❌ No | ✅ Works |
| Session Desktop (8101+) | 172.31.0.0/16 | ✅ Yes | ❌ Blocked |

### The Fix: Allow Established Connections

```bash
# Insert rule at position 1 to allow established/related connections
sudo iptables -I DOCKER-USER 1 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Verify the rule
sudo iptables -L DOCKER-USER -n -v --line-numbers

# Expected output:
Chain DOCKER-USER (1 references)
num   pkts bytes target     prot opt in     out     source               destination
1     500  40000 ACCEPT     all  --  *      *       0.0.0.0/0            0.0.0.0/0            ctstate ESTABLISHED,RELATED
2     100   8000 DROP       all  --  *      *       172.31.0.0/16        10.0.0.0/8
...
```

### How This Fixes the Issue

```
┌─────────────────┐                    ┌─────────────────┐
│  VPN Client     │                    │  Container      │
│  10.212.134.5   │                    │  172.31.0.10    │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │  1. SYN (new connection)             │
         │═════════════════════════════════════▶│  
         │     conntrack: NEW                   │
         │                                      │
         │  2. SYN-ACK (response)               │
         │◀═════════════════════════════════════│
         │     conntrack: ESTABLISHED           │
         │     ↑                                │
         │  MATCHES RULE #1 (ACCEPT)            │
         │  PACKET ALLOWED! ✅                  │
         │                                      │
```

### Persisting the Rule

```bash
# Install iptables-persistent if not already installed
sudo apt install iptables-persistent -y

# Save rules to persist across reboots
sudo netfilter-persistent save

# Or manually save:
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

### Security Considerations

| Rule | Purpose | Security Impact |
|------|---------|-----------------|
| `-m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT` | Allow responses to external connections | ✅ Safe — only allows responses, not new outbound |
| DROP 172.31.0.0/16 → private ranges | Prevent container-initiated connections to private networks | ✅ Maintains isolation |

**Important**: This rule does NOT compromise security. Containers still cannot initiate connections to private networks — they can only respond to connections that were initiated from outside.

---

## 4. Key Learning: Selkies TURN Server Configuration

### WebRTC and TURN Servers

Selkies EGL desktop uses WebRTC for streaming. WebRTC requires a TURN (Traversal Using Relays around NAT) server for media relay when direct P2P connections aren't possible.

```
┌─────────────┐         TURN Relay          ┌─────────────┐
│  Browser    │◀═══════════════════════════▶│  Container  │
│  (WebRTC)   │                             │  (Selkies)  │
└─────────────┘                             └─────────────┘
                     TURN Server
                   (192.168.10.92:19080+)
```

### Configuration via Environment Variable

The TURN host IP is set via `SELKIES_TURN_HOST` environment variable:

```bash
# In container environment
SELKIES_TURN_HOST=192.168.10.92
SELKIES_TURN_PORT=3478  # Internal container port
```

### Port Mapping

| Host Port | Container Port | Purpose |
|-----------|---------------|---------|
| 19080-19199 | 3478 | TURN server (one per session) |

### The Problem: Stale TURN IP After Migration

When migrating from Tailscale (100.100.66.101) to FortiClient (192.168.10.92):

1. `host-services/session-orchestration/app.py` was updated with new `HOST_IP`
2. But **existing running containers** still had old TURN_HOST baked in
3. WebRTC clients tried to connect to `100.100.66.101:19080` — unreachable!

### The Problem: coturn `external-ip` Misconfiguration

Even after updating the app.py TURN_HOST and relaunching containers, the WebRTC connection showed:
- **Peer connection type: host** (direct) instead of **relay** (TURN)
- **42% packet loss** and frequent disconnections
- Latency: 80ms video, 4200ms audio

**Root cause**: The host-level coturn TURN server (`/etc/turnserver.conf`) still had the old Tailscale IP in its `external-ip` setting. This IP is what coturn advertises to WebRTC clients as the relay address. With the wrong IP, TURN relay candidates were unusable, forcing WebRTC to fall back to direct UDP — which performs terribly through FortiClient VPN (unlike Tailscale's WireGuard which handles UDP efficiently).

```bash
# Check coturn config
sudo cat /etc/turnserver.conf | grep -iE "external-ip|listening-ip|realm|user"

# Before fix:
# external-ip=100.100.66.101  ← OLD Tailscale IP!

# After fix:
# external-ip=192.168.10.92   ← New FortiClient VPN IP
```

### Why Direct UDP Fails Through FortiClient But Worked With Tailscale

| VPN | Underlying Protocol | UDP Handling | WebRTC Direct (host) Performance |
|-----|---------------------|--------------|----------------------------------|
| **Tailscale** | WireGuard | Native UDP tunneling, minimal overhead | Excellent — near-LAN quality |
| **FortiClient** | IPSec/SSL VPN | UDP encapsulated in TCP/IPSec, higher overhead | Poor — 42% packet loss, frequent disconnections |

With Tailscale, you didn't need TURN relay because direct WebRTC worked fine. With FortiClient, **TURN TCP relay is essential** for stable streaming.

### Fix: Update coturn external-ip

```bash
# Update the external-ip
sudo sed -i 's/external-ip=100.100.66.101/external-ip=192.168.10.92/' /etc/turnserver.conf

# Restart coturn to apply
sudo systemctl restart coturn

# Verify
sudo grep external-ip /etc/turnserver.conf
# Should show: external-ip=192.168.10.92
```

After this fix, reload the desktop stream page. The WebRTC stats should show:
- **Peer connection type: relay** (instead of "host")
- Minimal packet loss
- Stable connection

### Checking Container TURN Configuration

```bash
# Check TURN config in a running container
docker inspect selkies-session-1 --format '{{range .Config.Env}}{{println .}}{{end}}' | grep TURN

# Expected output:
SELKIES_TURN_HOST=192.168.10.92
SELKIES_TURN_PORT=3478
```

### The Fix: Relaunch Sessions

```bash
# 1. Stop the old container
docker stop selkies-session-1

# 2. Remove the container (not the image)
docker rm selkies-session-1

# 3. Relaunch session from the app
# The app will create a new container with updated TURN_HOST
```

### TURN Configuration Files

| File | Setting | Notes |
|------|---------|-------|
| `host-services/session-orchestration/app.py` | `HOST_IP` default | Main orchestration service |
| `backend/scripts/host-deploy-sudo-isolation.sh` | `TURN_HOST`, `TURN_IP` | Session container deployment |

---

## 5. IP Migration Checklist (Tailscale → FortiClient)

### Files Requiring IP Updates

| File | Setting(s) | Old Value | New Value |
|------|-----------|-----------|-----------|
| `backend/.env` | `USER_STORAGE_PROVISION_URL` | `http://100.100.66.101:9999` | `http://192.168.10.92:9999` |
| `backend/.env` | `SESSION_ORCHESTRATION_URL` | `http://100.100.66.101:9998` | `http://192.168.10.92:9998` |
| `backend/src/compute/compute.service.ts` | Fallback orchestration URL | `100.100.66.101` | `192.168.10.92` |
| `backend/src/compute/compute.service.ts` | Node IP | `100.100.66.101` | `192.168.10.92` |
| `backend/prisma/seed.ts` | `ipCompute` | `100.100.66.101` | `192.168.10.92` |
| `backend/prisma/seed.ts` | `ipStorage` | `100.100.66.101` | `192.168.10.92` |
| `host-services/session-orchestration/app.py` | `HOST_IP` default | `100.100.66.101` | `192.168.10.92` |
| `host-services/session-orchestration/app.py` | `TURN_HOST` default | `100.100.66.101` | `192.168.10.92` |
| `backend/scripts/host-deploy-sudo-isolation.sh` | `TURN_HOST` default | `100.100.66.101` | `192.168.10.92` |
| `backend/scripts/host-deploy-sudo-isolation.sh` | `TURN_IP` default | `100.100.66.101` | `192.168.10.92` |
| `/etc/turnserver.conf` (on host) | `external-ip` | `100.100.66.101` | `192.168.10.92` |

### Migration Steps

```bash
# 1. Update all IP references in files above

# 2. Update database seed (if re-seeding)
cd backend
npx prisma db seed

# 3. Restart backend
npm run start:dev

# 4. Restart Flask services on host
sudo systemctl restart session-orchestration
sudo systemctl restart storage-provision

# 5. Update coturn external-ip and restart
sudo sed -i 's/external-ip=OLD_IP/external-ip=NEW_IP/' /etc/turnserver.conf
sudo systemctl restart coturn

# 6. Stop and remove all session containers
docker ps -q --filter "name=selkies" | xargs -r docker stop
docker ps -aq --filter "name=selkies" | xargs -r docker rm

# 7. Add iptables rule for VPN access
sudo iptables -I DOCKER-USER 1 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo netfilter-persistent save

# 8. Verify connectivity
# From dev machine:
Test-NetConnection -ComputerName 192.168.10.92 -Port 8101
```

### Quick Search for Old IPs

```bash
# Find all occurrences of old Tailscale IP
grep -r "100.100.66" . --include="*.ts" --include="*.js" --include="*.env*" --include="*.py" --include="*.sh"

# Find all IP references (for verification)
grep -r "192.168.10.92" . --include="*.ts" --include="*.js" --include="*.env*" --include="*.py" --include="*.sh"
```

---

## 6. Diagnostic Commands Reference

### Network Connectivity

```powershell
# PowerShell: Test TCP connection to host:port
Test-NetConnection -ComputerName 192.168.10.92 -Port 8101

# Output interpretation:
# TcpTestSucceeded : True  → Port is reachable
# TcpTestSucceeded : False → Port blocked or service down
```

> ⚠️ **Warning**: `Test-NetConnection` is a PowerShell cmdlet. It does NOT work in:
> - Windows Command Prompt (cmd.exe)
> - Linux shells (bash, sh, zsh)
> 
> Use `Test-NetConnection -ComputerName IP -Port PORT` only in PowerShell.

```bash
# Linux: Test TCP connection
nc -zv 192.168.10.92 8101

# Or with timeout
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/192.168.10.92/8101' && echo "Open" || echo "Closed"
```

### Port Binding

```bash
# Check what's listening on a port
sudo ss -tlnp | grep 8101

# Output interpretation:
# 0.0.0.0:8101  → Listening on all interfaces (accessible externally) ✅
# 127.0.0.1:8101 → Listening on localhost only (NOT accessible externally) ❌
```

### iptables Inspection

```bash
# List DOCKER-USER chain rules with counters
sudo iptables -L DOCKER-USER -n -v --line-numbers

# Check NAT rules for a specific port
sudo iptables -t nat -L -n -v | grep 8101

# Check which Docker network a port belongs to
sudo iptables -t nat -L DOCKER -n -v | grep 8101
# Look for DNAT to:172.30.x.x (monitoring) or 172.31.x.x (sessions)
```

### Container Inspection

```bash
# Check all environment variables
docker inspect CONTAINER_NAME --format '{{range .Config.Env}}{{println .}}{{end}}'

# Check TURN configuration specifically
docker inspect CONTAINER_NAME --format '{{range .Config.Env}}{{println .}}{{end}}' | grep TURN

# Check container's Docker network
docker inspect CONTAINER_NAME --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}'

# Check container IP
docker inspect CONTAINER_NAME --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
```

### Packet Tracing

```bash
# Capture packets on a specific port
sudo tcpdump -i any port 8101 -n -c 20

# Look for:
# - Incoming SYN packets (client trying to connect)
# - Outgoing SYN-ACK (server responding)
# - No response = packet being dropped somewhere

# Capture with more detail
sudo tcpdump -i any port 8101 -n -vv -c 20
```

### HTTP Testing

```bash
# Test HTTP endpoint from the host itself
curl -s -o /dev/null -w "%{http_code}" http://192.168.10.92:8101/

# 200 = OK
# 404 = Service running, wrong path
# Connection refused = Service not running or wrong port
# Timeout = Firewall blocking

# Test with verbose output
curl -v http://192.168.10.92:8101/
```

### Docker Network Inspection

```bash
# List all Docker networks
docker network ls

# Inspect a network to see connected containers
docker network inspect bridge
docker network inspect laas_monitoring
docker network inspect laas_sessions

# Check network subnet
docker network inspect NETWORK_NAME --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

### Quick Diagnostic Flowchart

```
Connection Fails
       │
       ▼
┌──────────────────┐     No     ┌─────────────────────┐
│ Test-NetConnection│──────────▶│ VPN not connected   │
│    succeeds?     │            │ or wrong IP         │
└────────┬─────────┘            └─────────────────────┘
         │ Yes
         ▼
┌──────────────────┐     No     ┌─────────────────────┐
│ ss -tlnp shows   │──────────▶│ Service not running │
│ 0.0.0.0:PORT?    │            │ or wrong bind       │
└────────┬─────────┘            └─────────────────────┘
         │ Yes
         ▼
┌──────────────────┐     Yes    ┌─────────────────────┐
│ iptables DOCKER-USER│────────▶│ Add ESTABLISHED     │
│ DROP matches?    │            │ rule to DOCKER-USER │
└────────┬─────────┘            └─────────────────────┘
         │ No
         ▼
┌──────────────────┐
│ Check container  │
│ TURN config      │
│ (for WebRTC)     │
└──────────────────┘
```

---

## 7. Tailscale vs FortiClient VPN Comparison

| Aspect | Tailscale | FortiClient |
|--------|-----------|-------------|
| **Architecture** | Peer-to-peer mesh | Hub-and-spoke (via FortiGate) |
| **Port Filtering** | None — all ports open between peers | Explicit firewall policies required |
| **IP Assignment** | 100.x.x.x (CGNAT range) | Internal range (e.g., 10.212.134.x) |
| **NAT Traversal** | Automatic (DERP servers) | Via TURN/STUN configuration |
| **Enterprise Control** | Limited | Full (FortiGate policies) |
| **Setup Complexity** | Simple (install & auth) | Moderate (FortiGate config) |
| **Cost** | Free tier available | Requires Fortinet license |

### Key Differences for LaaS

#### Tailscale Behavior
```
Dev Machine (100.100.66.50) ──────── Host (100.100.66.101)
                  │
                  └── All ports accessible by default
                      No firewall policies needed
```

#### FortiClient Behavior
```
Dev Machine (10.212.134.5) ────▶ FortiGate ────▶ Host (192.168.10.92)
                                        │
                                        └── Firewall policies control
                                            which ports pass through
```

### Troubleshooting Port Access Through FortiClient

If a port is accessible from the host but not through VPN:

1. **Check FortiGate firewall policies** — Ensure the VPN-to-internal policy allows the port
2. **Verify VPN routing** — Check that 192.168.10.0/24 is routed through VPN
3. **Test from different VPN clients** — Rule out client-specific issues

### When to Use Each

| Scenario | Recommended VPN |
|----------|-----------------|
| Development/Testing | Tailscale (simplicity) |
| Production/Enterprise | FortiClient (security policies) |
| Quick POC | Tailscale |
| Compliance requirements | FortiClient |

---

## 8. Docker Restart After iptables Flush

### The Problem

If iptables rules are ever flushed (e.g., `sudo iptables -F`), Docker's NAT chains are destroyed:

```bash
# NEVER run this without understanding consequences!
sudo iptables -F

# This removes:
# - DOCKER chain (NAT rules for port mapping)
# - DOCKER-USER chain (custom rules)
# - DNAT rules for container ports
```

### Symptoms After Flush

- Container ports become inaccessible
- `docker ps` shows containers running but no connectivity
- `iptables -t nat -L DOCKER` shows empty or missing chain

### The Fix

```bash
# 1. Restart Docker to rebuild NAT chains
sudo systemctl restart docker

# 2. Re-add the ESTABLISHED rule to DOCKER-USER
sudo iptables -I DOCKER-USER 1 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# 3. Persist the rules
sudo netfilter-persistent save
```

### Why Docker Restart Works

Docker maintains its iptables rules in memory and regenerates them on startup:

1. Reads all container port mappings
2. Creates DNAT rules in `DOCKER` chain
3. Creates corresponding rules in `FORWARD` chain
4. Does NOT recreate custom `DOCKER-USER` rules

### Container Port Paths

```
External Request
       │
       ▼
┌─────────────────────────────────────┐
│           PREROUTING                │
│  (DNAT: Host:Port → Container:Port) │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│           DOCKER-USER               │  ← Custom rules go here
│  (First user-defined rules)         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│           DOCKER                    │
│  (Docker's own rules)               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│           FORWARD                   │
│  (Routing decision)                 │
└─────────────────────────────────────┘
```

### docker-proxy vs DNAT

| Path | Layer | Performance | Use Case |
|------|-------|-------------|----------|
| docker-proxy | Userspace | Slower | Fallback, localhost binding |
| DNAT (iptables) | Kernel | Faster | Default for 0.0.0.0 binding |

Most container ports use DNAT path, which goes through `DOCKER-USER` chain.

### Post-Restart Checklist

```bash
# After Docker restart, verify:
# 1. Containers are running
docker ps

# 2. NAT rules exist
sudo iptables -t nat -L DOCKER -n | grep DNAT

# 3. DOCKER-USER has ESTABLISHED rule
sudo iptables -L DOCKER-USER -n | grep ESTABLISHED

# 4. Connectivity works
curl -s -o /dev/null -w "%{http_code}" http://192.168.10.92:8101/
```

---

## Quick Reference Card

### Common Issues and Fixes

| Issue | Check | Fix |
|-------|-------|-----|
| Can't reach host at all | `Test-NetConnection IP 22` | Connect VPN |
| Port works from host but not VPN | `iptables -L DOCKER-USER` | Add ESTABLISHED rule |
| Desktop stream fails | `docker inspect \| grep TURN` | Relaunch session |
| Desktop connects but high latency/disconnects | Selkies stats: "Peer type: host" | Fix coturn `external-ip` in `/etc/turnserver.conf` |
| Grafana works but desktop doesn't | Check Docker network | Session on 172.31.x = blocked |
| After iptables flush | `iptables -t nat -L DOCKER` | Restart Docker |

### Essential Commands

```bash
# Add VPN access rule (must do after Docker restart)
sudo iptables -I DOCKER-USER 1 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo netfilter-persistent save

# Check container TURN config
docker inspect CONTAINER --format '{{range .Config.Env}}{{println .}}{{end}}' | grep TURN

# Check port binding
sudo ss -tlnp | grep PORT

# Check iptables rules
sudo iptables -L DOCKER-USER -n -v --line-numbers
```

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2026-04-06 | LaaS Team | Initial document created from Tailscale → FortiClient migration learnings |

---

*This document is maintained by the LaaS team. Update it when discovering new networking issues or solutions.*
