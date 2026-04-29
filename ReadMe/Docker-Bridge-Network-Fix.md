# Docker Bridge Network Fix After IP Change

## What Happened

So here's the situation — the LaaS host machine's IP changed from `192.168.10.92` to `192.168.10.99`. We updated all the backend config files (`.env`, `compute.service.ts`, `seed.ts`, deployment scripts) with the new IP. Everything seemed fine... until GPU compute instance launches started failing with "launch timed out after 120 seconds."

The session orchestrator's readiness check (`curl http://127.0.0.1:{port}/`) was getting absolutely no response. Just silence. Super frustrating.

---

## Investigation & Root Cause

Let me walk you through the debugging journey:

### Inside the Container — Everything Looked Fine
- nginx was listening on port 8080
- All supervisord processes showed RUNNING
- GPU was accessible
- The container was **perfectly healthy** from the inside

### From the Host — The Problem Emerged
- Docker port forwarding (docker-proxy) was running
- TCP connections to `127.0.0.1:8102` CONNECTED successfully (SYN/ACK completed)
- BUT the HTTP response never came back — curl just hung after connecting
- Direct curl from host to container bridge IP (`172.31.0.3:8080`) also timed out

This confirmed the bridge network was broken at the **kernel level**.

### The Smoking Gun
Checking iptables revealed the real issue:

```
sudo iptables -L DOCKER-CT -n -v
```

The `DOCKER-CT` chain showed **0 packets** flowing to `br-80ce3db71243` (the laas-sessions bridge). Meanwhile, the monitoring bridge (`br-afd53b1bc0aa`) had 16K+ packets flowing normally.

### Root Cause
The `laas-sessions` Docker bridge network (172.31.0.0/16, ICC disabled) had entered a broken state. This was likely caused by the Docker daemon restart after the IP change corrupting the bridge's iptables forwarding rules.

Note: Tailscale (`ts-forward` chain in iptables FORWARD) was also present on the host, but wasn't directly blocking — the issue was Docker's own bridge routing.

---

## The Fix

Here's what fixed it:

1. **Stop and remove all session containers** on the broken bridge
2. **Delete the `laas-sessions` network:**
   ```bash
   docker network rm laas-sessions
   ```
3. **Recreate it:**
   ```bash
   docker network create --driver bridge --subnet 172.31.0.0/16 --gateway 172.31.0.1 -o "com.docker.network.bridge.enable_icc=false" laas-sessions
   ```
4. **Restart Docker daemon:**
   ```bash
   sudo systemctl restart docker
   ```
5. **Verify the bridge route exists:**
   ```bash
   ip route show | grep 172.31
   ```

---

## Other IP-Related Fixes Required

After an IP change, you'll also need to update these:

### Backend `.env`
- `USER_STORAGE_PROVISION_URL`
- `SESSION_ORCHESTRATION_URL`

### Backend `compute.service.ts`
- Fallback orchestration URL
- `nodeIp` fallback value

### Backend `prisma/seed.ts`
- `ipCompute` value
- `ipStorage` value

### Database `nodes` Table
- `ip_compute` and `ip_storage` columns
- Run UPDATE SQL directly (seed only runs once):
  ```sql
  UPDATE nodes SET ip_compute = '192.168.10.99', ip_storage = '192.168.10.99';
  ```

### coturn Config
- Edit `/etc/turnserver.conf` — update `external-ip=` field
- Then: `sudo systemctl restart coturn`

### Session Orchestrator
- Update `HOST_IP` and `TURN_HOST` environment variables
- Restart orchestrator in tmux

### Backend Deployment Script (`host-deploy-sudo-isolation.sh`)
- Update `TURN_HOST` default
- Update `TURN_IP` defaults

---

## Diagnostic Commands Used

These commands helped identify the issue:

### Check nginx listening inside container
```bash
docker exec <container> ss -tlnp | grep 8080
```

### Check all processes inside container
```bash
docker exec <container> supervisorctl status
```

### Test nginx from inside container (this worked!)
```bash
docker exec <container> curl -v http://127.0.0.1:8080/
```

### Test from host via docker-proxy (this hung)
```bash
curl -v --connect-timeout 5 http://127.0.0.1:<port>/
```

### Test direct bridge connectivity (timed out — confirmed bridge broken)
```bash
curl -v --connect-timeout 5 http://172.31.0.X:8080/
```

### The smoking gun — showed 0 packets to laas-sessions bridge
```bash
sudo iptables -L DOCKER-CT -n -v
```

### Show DROP/ACCEPT rules for bridges
```bash
sudo iptables -L DOCKER-FORWARD -n -v --line-numbers
```

### Show per-port ACCEPT rules with 0 hits
```bash
sudo iptables -L DOCKER -n -v
```

### Check bridge subnet and connected containers
```bash
docker network inspect laas-sessions
```

### Verify kernel route to bridge subnet exists
```bash
ip route show | grep 172.31
```

---

## Things You Might Have Missed

This section covers the subtle details that could trip you up:

- **The monitoring stack kept working** — Those containers were on a separate bridge (`br-afd53b1bc0aa`) and continued working fine. This made it look like Docker was healthy when actually only the laas-sessions bridge was broken. Don't let this fool you!

- **`docker ps` looked perfectly normal** — It showed correct port mappings and containers "Up X minutes." Everything LOOKED fine from Docker's perspective. The problem was hidden at the kernel routing level.

- **TCP connections succeeded but data didn't flow** — This is the tricky part. docker-proxy would complete the TCP handshake (SYN/ACK), but then HTTP data wouldn't transfer. This is very misleading and points to a kernel-level bridge routing issue, not a simple port mapping problem.

- **Firewall wasn't the cause** — UFW was inactive and the DOCKER-USER chain was empty. We spent time investigating this but it was a red herring.

- **Tailscale's presence** — The `ts-forward` chain was present but positioned AFTER Docker chains in the FORWARD chain. It wasn't the direct cause, but worth noting as a potential complicating factor if you have Tailscale installed.

- **NO-CARRIER and linkdown after recreation** — After recreating the network, the bridge showed `NO-CARRIER` and `linkdown`. This is NORMAL when no containers are connected. The bridge goes UP once a container joins the network. Don't panic when you see this!
