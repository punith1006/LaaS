# LaaS Platform - CentOS Server Deployment Guide

This guide provides step-by-step instructions to deploy the LaaS (Lab as a Service) platform on a CentOS server. The platform consists of:

- **Frontend**: Next.js 15 (React)
- **Backend**: NestJS + Prisma + PostgreSQL
- **Auth**: Keycloak (SSO/OAuth)
- **Host Services**: Session Orchestration & Storage Provision (Flask/Python)
- **Optional**: Monitoring Stack (Docker Compose)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Your CentOS Server                           │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Frontend   │  │   Backend    │  │  PostgreSQL  │              │
│  │   Next.js    │  │   NestJS     │  │              │              │
│  │   :3000      │  │   :3001      │  │   :5432      │              │
│  └──────────────┘  └──────┬───────┘  └──────────────┘              │
│                            │                                         │
│              ┌─────────────┼─────────────┐                          │
│              │             │             │                          │
│              ▼             ▼             ▼                          │
│       ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│       │  Keycloak  │ │  Session   │ │  Storage   │                  │
│       │   (Docker) │ │  Orchestr. │ │  Provision │                  │
│       │   :8080    │ │   :9998    │ │   :9999    │                  │
│       └────────────┘ │  (Flask)   │ │  (Flask)   │                  │
│                       └────────────┘ └────────────┘                  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           Monitoring Stack (Docker Compose)                    │  │
│  │  Prometheus :9090 │ Grafana :3002 │ Loki :3100                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Service Communication

| From | To | Purpose |
|------|-----|---------|
| Frontend | Backend (:3001) | REST API calls |
| Backend | PostgreSQL (:5432) | Database queries |
| Backend | Keycloak (:8080) | SSO/OAuth validation |
| Backend | Session Orch (:9998) | GPU container management API |
| Backend | Storage Provision (:9999) | ZFS quota provisioning API |
| Backend | Monitoring | Metrics scraping (optional) |

## IMPORTANT: Host Services are NOT Docker Containers

The **Session Orchestration** and **Storage Provision** services are standalone Flask/Python applications that:
- Run directly on the host (not in Docker)
- Expose HTTP API endpoints
- Are contacted by the backend via REST calls
- Handle GPU/container management and ZFS storage operations

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| Disk | 50 GB | 100+ GB SSD |
| OS | CentOS 7/8/Stream | CentOS Stream 9 |
| GPU | Optional | NVIDIA GPU for compute |

### Network Requirements

- Ports 80, 443 (HTTP/HTTPS)
- Port 3000 (Frontend)
- Port 3001 (Backend API)
- Port 8080 (Keycloak)
- Port 5432 (PostgreSQL)
- Port 9998 (Session Orchestration API)
- Port 9999 (Storage Provision API)

---

## Phase 1: Server Preparation

### Step 1.1 - Update System and Install Base Dependencies

```bash
# SSH into your CentOS server
ssh root@YOUR_SERVER_IP

# Update system packages
dnf update -y

# Install required utilities
dnf install -y curl wget git unzip tarPolicycoreutils selinux-policy-devel

# Install EPEL repository (for additional packages)
dnf install -y epel-release
```

### Step 1.2 - Install Node.js 20 LTS

```bash
# Install NodeSource repository for Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -

# Install Node.js
dnf install -y nodejs

# Verify installation
node --version    # Should show v20.x.x
npm --version
```

### Step 1.3 - Install Python 3.11+ (for Host Services)

```bash
# Install Python and development tools
dnf install -y python3 python3-pip python3-devel gcc make

# Create symlink
alternatives --set python3 /usr/bin/python3.11

# Verify
python3 --version
pip3 --version
```

### Step 1.4 - Install Docker and Docker Compose

```bash
# Install Docker
dnf install -y dnf-plugins-core
dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add current user to docker group (replace 'centos' with your username)
usermod -aG docker centos

# Verify Docker
docker --version
docker compose version
```

### Step 1.5 - Configure Firewall (Optional but Recommended)

```bash
# Install firewalld
dnf install -y firewalld
systemctl start firewalld
systemctl enable firewalld

# Open required ports
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --permanent --add-port=3001/tcp
firewall-cmd --permanent --add-port=8080/tcp
firewall-cmd --permanent --add-port=5432/tcp
firewall-cmd --permanent --add-port=9998/tcp
firewall-cmd --permanent --add-port=9999/tcp

# Reload firewall
firewall-cmd --reload

# List open ports
firewall-cmd --list-ports
```

---

## Phase 2: PostgreSQL Database Setup

### Step 2.1 - Install PostgreSQL 15

```bash
# Install PostgreSQL
dnf install -y postgresql-server postgresql-contrib

# Initialize database
postgresql-setup --initdb

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Verify
systemctl status postgresql
```

### Step 2.2 - Configure PostgreSQL

```bash
# Switch to postgres user
su - postgres

# Create database and user
psql << 'EOF'
-- Create database
CREATE DATABASE laas;

-- Create user (change 'root' to your preferred password)
CREATE USER laasuser WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE laas TO laasuser;

-- Connect to database and grant schema permissions
\c laas
GRANT ALL ON SCHEMA public TO laasuser;
ALTER DATABASE laas OWNER TO laasuser;
EOF

# Exit postgres user shell
exit
```

### Step 2.3 - Configure PostgreSQL Remote Access

```bash
# Edit PostgreSQL configuration
vi /var/lib/pgsql/data/postgresql.conf

# Find and modify:
# listen_addresses = 'localhost'  →  listen_addresses = '*'

# Edit pg_hba.conf for remote connections
vi /var/lib/pgsql/data/pg_hba.conf

# Add this line before the default rules:
host    all     all     0.0.0.0/0     md5

# Restart PostgreSQL
systemctl restart postgresql
```

---

## Phase 3: Keycloak (SSO) Setup

### Option A: Deploy Keycloak with Docker (Recommended for CentOS)

```bash
# Create Keycloak data directory
mkdir -p /opt/laas/keycloak
cd /opt/laas/keycloak

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    container_name: laas-keycloak
    restart: unless-stopped
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://localhost:5432/laas
      KC_DB_USERNAME: laasuser
      KC_DB_PASSWORD: your_secure_password
      KC_HOSTNAME_STRICT: false
      KC_HOSTNAME_STRICT_HTTPS: false
      KC_PROXY: edge
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
    command:
      - start-dev
      - --http-port=8080
    ports:
      - "8080:8080"
    volumes:
      - ./data:/opt/keycloak/data
    networks:
      - laas-net

networks:
  laas-net:
    driver: bridge
EOF

# Start Keycloak
docker compose up -d

# Wait for Keycloak to start (takes ~1-2 minutes)
docker logs -f laas-keycloak
# Look for "Keycloak started in X.XX seconds"
```

### Option B: Install Keycloak Directly (Advanced)

```bash
# Download Keycloak
cd /opt
wget https://github.com/keycloak/keycloak/releases/download/26.0.0/keycloak-26.0.0.tar.gz
tar -xzf keycloak-26.0.0.tar.gz
rm keycloak-26.0.0.tar.gz
ln -s keycloak-26.0.0 keycloak

# Create service file
cat > /etc/systemd/system/keycloak.service << 'EOF'
[Unit]
Description=Keycloak Server
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/keycloak
ExecStart=/opt/keycloak/bin/kc.sh start-dev --http-port=8080
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Start Keycloak
systemctl daemon-reload
systemctl start keycloak
systemctl enable keycloak
```

### Step 3.1 - Initial Keycloak Configuration

1. Open browser: `http://YOUR_SERVER_IP:8080`
2. Click **Administration Console**
3. Login with `admin` / `admin`
4. **Change the admin password immediately!**

### Step 3.2 - Create LaaS Realm

1. In Keycloak admin, click **Create realm** (top-left dropdown)
2. **Realm name**: `laas`
3. Toggle **Enabled**: ON
4. Click **Create**

### Step 3.3 - Create Keycloak Clients

#### Client 1: laas-backend (Confidential)

1. Go to **Clients** → **Create client**
2. **Client type**: OpenID Connect
3. **Client ID**: `laas-backend`
4. Click **Next**
5. **Capability config**:
   - **Client authentication**: ON
   - **Authorization**: OFF
   - **Standard flow**: OFF
   - **Direct access grants**: ON
6. Click **Save**
7. Go to **Credentials** tab, copy the **Client secret**

#### Client 2: laas-frontend (Public)

1. **Clients** → **Create client**
2. **Client type**: OpenID Connect
3. **Client ID**: `laas-frontend`
4. Click **Next**
5. **Capability config**:
   - **Client authentication**: OFF
   - **Authorization**: OFF
   - **Standard flow**: ON
   - **Direct access grants**: OFF
6. Click **Save**
7. **Access settings**:
   - **Root URL**: `http://YOUR_SERVER_IP:3000`
   - **Home URL**: `http://YOUR_SERVER_IP:3000/signin`
   - **Valid redirect URIs**: `http://YOUR_SERVER_IP:3000/*`
   - **Valid post logout redirect URIs**: `http://YOUR_SERVER_IP:3000/signin`
   - **Web origins**: `http://YOUR_SERVER_IP:3000`

### Step 3.4 - Create LaaS Academy Test Realm (for SSO Testing)

Follow the detailed guide in `docs/keycloak-laas-academy-setup.md`:

1. Create realm `laas-academy`
2. Create client `laas-realm-broker` in laas-academy
3. Create test user `student`
4. Register laas-academy as IdP in laas realm
5. Configure post-logout redirect URIs

---

## Phase 4: Backend Deployment

### Step 4.1 - Transfer Project Files

```bash
# On your LOCAL machine, zip the backend folder
cd c:\Users\Punith\LaaS
powershell Compress-Archive -Path backend -DestinationPath backend.zip

# Transfer to server (from local terminal)
scp backend.zip centos@YOUR_SERVER_IP:/home/centos/

# On server: Extract and setup
ssh centos@YOUR_SERVER_IP
cd /home/centos
unzip -o backend.zip
rm backend.zip
mv backend /opt/laas/
cd /opt/laas/backend
```

### Step 4.2 - Install Backend Dependencies

```bash
cd /opt/laas/backend

# Install dependencies
npm install

# Install Prisma CLI globally (optional but useful)
npm install -g prisma
```

### Step 4.3 - Configure Backend Environment

```bash
cd /opt/laas/backend

# Copy and edit environment file
cp .env.example .env
vi .env
```

Edit `.env` with your production values:

```env
# Database
DATABASE_URL="postgresql://laasuser:your_secure_password@localhost:5432/laas"

# Backend Server
PORT=3001
CORS_ORIGIN="http://YOUR_SERVER_IP:3000"

# JWT Configuration
JWT_SECRET=generate-a-very-long-random-string-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# SMTP (Email Service)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Keycloak Configuration
KEYCLOAK_URL=http://YOUR_SERVER_IP:8080
KEYCLOAK_REALM=laas
KEYCLOAK_CLIENT_ID=laas-backend
KEYCLOAK_CLIENT_SECRET=your-backend-client-secret-from-step-3.3
KEYCLOAK_FRONTEND_CLIENT_ID=laas-frontend
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=your-admin-password

# Optional: Storage Provisioning (if you have ZFS storage host)
USER_STORAGE_PROVISION_URL=http://YOUR_STORAGE_HOST_IP:9999/provision
USER_STORAGE_PROVISION_SECRET=your-shared-secret

# Optional: Session Orchestration (if you have GPU compute nodes)
SESSION_ORCHESTRATION_URL=http://YOUR_GPU_NODE_IP:9998
SESSION_ORCHESTRATION_SECRET=your-session-secret
SESSION_CREDENTIAL_KEY=64-char-hex-key-for-session-encryption

# Razorpay (Payment Gateway)
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

### Step 4.4 - Database Migration and Seeding

```bash
cd /opt/laas/backend

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed initial data (creates public org, roles, etc.)
npm run prisma:seed
```

### Step 4.5 - Build Backend

```bash
cd /opt/laas/backend

# Build the application
npm run build

# Verify build
ls -la dist/
```

### Step 4.6 - Create Backend System Service

```bash
# Create systemd service file
sudo tee /etc/systemd/system/laas-backend.service << 'EOF'
[Unit]
Description=LaaS Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=centos
WorkingDirectory=/opt/laas/backend
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl start laas-backend
sudo systemctl enable laas-backend

# Check status
sudo systemctl status laas-backend

# View logs
sudo journalctl -u laas-backend -f
```

### Step 4.7 - Test Backend API

```bash
# Test health endpoint
curl http://localhost:3001

# Test Keycloak connection (if Keycloak is running)
curl http://YOUR_SERVER_IP:8080/realms/laas/.well-known/openid-configuration
```

---

## Phase 5: Frontend Deployment

### Step 5.1 - Transfer Frontend Files

```bash
# On your LOCAL machine
cd c:\Users\Punith\LaaS
powershell Compress-Archive -Path frontend -DestinationPath frontend.zip

# Transfer to server
scp frontend.zip centos@YOUR_SERVER_IP:/home/centos/

# On server
ssh centos@YOUR_SERVER_IP
cd /home/centos
unzip -o frontend.zip
mv frontend /opt/laas/
cd /opt/laas/frontend
```

### Step 5.2 - Install Frontend Dependencies

```bash
cd /opt/laas/frontend
npm install
```

### Step 5.3 - Configure Frontend Environment

```bash
cd /opt/laas/frontend

# Create .env.local
cat > .env.local << 'EOF'
# Backend API URL
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:3001

# Keycloak Configuration
NEXT_PUBLIC_KEYCLOAK_URL=http://YOUR_SERVER_IP:8080
NEXT_PUBLIC_KEYCLOAK_REALM=laas
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=laas-frontend

# Razorpay Configuration
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key
EOF
```

### Step 5.4 - Build Frontend

```bash
cd /opt/laas/frontend

# Build for production
npm run build

# Verify build output
ls -la .next/
```

### Step 5.5 - Create Frontend System Service (for Development Mode)

For production, use PM2 or Nginx. Here's using PM2:

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'laas-frontend',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000',
    cwd: '/opt/laas/frontend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save

# Enable startup script
pm2 startup
# Run the systemd command output by pm2 startup

# Check status
pm2 status
pm2 logs laas-frontend
```

### Step 5.6 - (Alternative) Setup PM2 for Frontend

```bash
# Install PM2 globally
npm install -g pm2

# Start frontend with PM2
cd /opt/laas/frontend
pm2 start npm --name "laas-frontend" -- start

# Setup startup script
pm2 startup
pm2 save
```

---

## Phase 6: Host Services (Flask Apps - NOT Docker Containers)

These services run directly on the host as Python Flask applications. They are NOT Docker containers. The backend contacts them via HTTP REST APIs.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Your CentOS Server                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Host Services (Flask Apps)                   │   │
│  │                                                           │   │
│  │  ┌──────────────────┐    ┌──────────────────────────┐    │   │
│  │  │ Session Orchestr.│    │   Storage Provision      │    │   │
│  │  │ Python/Flask     │    │   Python/Flask           │    │   │
│  │  │ Port: 9998       │    │   Port: 9999              │    │   │
│  │  │                  │    │                          │    │   │
│  │  │ • Docker control │    │   • ZFS dataset create   │    │   │
│  │  │ • GPU allocation │    │   • Quota management     │    │   │
│  │  │ • VNC/SSH mgmt   │    │   • NFS export config    │    │   │
│  │  └────────┬─────────┘    └──────────┬───────────────┘    │   │
│  │           │                           │                     │   │
│  │           └───────────┬───────────────┘                     │   │
│  │                       │                                     │   │
│  │                       ▼                                     │   │
│  │              ┌─────────────────┐                            │   │
│  │              │   Backend API   │                            │   │
│  │              │   (:3001)       │                            │   │
│  │              └─────────────────┘                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Step 6.1 - Session Orchestration Service (Flask App)

This Flask app manages GPU containers. Run it directly on the host:

```bash
# Create directory
sudo mkdir -p /opt/laas/host-services
sudo chown centos:centos /opt/laas/host-services

# Copy from local machine
scp -r host-services/session-orchestration centos@YOUR_SERVER_IP:/opt/laas/host-services/

# Install dependencies
cd /opt/laas/host-services/session-orchestration
pip3 install -r requirements.txt

# Configure environment
cat > .env << 'EOF'
PORT=9998
SECRET_KEY=your-session-secret
CREDENTIAL_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
NODE_ID=laas-node-1
EOF

# Run directly with Python (NOT Docker)
nohup python3 app.py > session-orch.log 2>&1 &

# Verify it's running
curl http://localhost:9998/health
```

**Create a systemd service for auto-start:**

```bash
sudo tee /etc/systemd/system/laas-session-orch.service << 'EOF'
[Unit]
Description=LaaS Session Orchestration Service
After=network.target docker.service

[Service]
Type=simple
User=centos
WorkingDirectory=/opt/laas/host-services/session-orchestration
ExecStart=/usr/bin/python3 app.py
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable laas-session-orch
sudo systemctl start laas-session-orch
```

### Step 6.2 - Storage Provision Service (Flask App)

This Flask app manages ZFS storage provisioning. Run it directly on the host:

```bash
# Copy from local machine
scp -r host-services/storage-provision centos@YOUR_SERVER_IP:/opt/laas/host-services/

# Install dependencies
cd /opt/laas/host-services/storage-provision
pip3 install -r requirements.txt

# Configure environment
cat > .env << 'EOF'
PORT=9999
PROVISION_SECRET=your-shared-secret
EOF

# Run directly with Python (NOT Docker)
nohup python3 app.py > storage-provision.log 2>&1 &

# Verify it's running
curl http://localhost:9999/health
```

**Create a systemd service for auto-start:**

```bash
sudo tee /etc/systemd/system/laas-storage-provision.service << 'EOF'
[Unit]
Description=LaaS Storage Provision Service
After=network.target

[Service]
Type=simple
User=centos
WorkingDirectory=/opt/laas/host-services/storage-provision
ExecStart=/usr/bin/python3 app.py
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable laas-storage-provision
sudo systemctl start laas-storage-provision
```

### Step 6.3 - Configure Backend to Call Host Services

Add these to your backend `.env` file to enable the backend to call these services:

```env
# Session Orchestration Service (Flask app on host)
SESSION_ORCHESTRATION_URL=http://localhost:9998
SESSION_ORCHESTRATION_SECRET=your-session-secret
SESSION_CREDENTIAL_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Storage Provisioning Service (Flask app on host)
USER_STORAGE_PROVISION_URL=http://localhost:9999/provision
USER_STORAGE_PROVISION_SECRET=your-shared-secret
```

**Important:** If Host Services are on a **different server** than the backend, use the server's IP:

```env
# For remote GPU node
SESSION_ORCHESTRATION_URL=http://100.100.66.101:9998

# For remote storage node
USER_STORAGE_PROVISION_URL=http://100.100.66.102:9999/provision
```

---

## Phase 7: Monitoring Stack (Optional)

### Step 7.1 - Deploy Monitoring with Docker Compose

```bash
# Transfer monitoring files
scp -r monitoring_setup_files centos@YOUR_SERVER_IP:~/

# On server
ssh centos@YOUR_SERVER_IP
cd ~/monitoring_setup_files/laas-monitoring

# Copy and configure environment
cp .env.example .env
vi .env

# Start monitoring stack
docker compose up -d

# Verify services are running
docker compose ps

# Access dashboards:
# - Prometheus: http://YOUR_SERVER_IP:9090
# - Grafana: http://YOUR_SERVER_IP:3002 (admin/admin)
# - Loki: http://YOUR_SERVER_IP:3100
# - Alertmanager: http://YOUR_SERVER_IP:9093
```

---

## Phase 8: Production Hardening (Recommended)

### Step 8.1 - Setup Nginx Reverse Proxy

```bash
# Install Nginx
dnf install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Configure for LaaS
cat > /etc/nginx/conf.d/laas.conf << 'EOF'
# Frontend
upstream laas_frontend {
    server 127.0.0.1:3000;
}

# Backend API
upstream laas_backend {
    server 127.0.0.1:3001;
}

# Keycloak
upstream laas_keycloak {
    server 127.0.0.1:8080;
}

server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Redirect HTTP to HTTPS (uncomment after SSL setup)
    # return 301 https://$server_name$request_uri;
}

# Uncomment after SSL certificate setup:
# server {
#     listen 443 ssl http2;
#     server_name YOUR_DOMAIN_OR_IP;
# 
#     ssl_certificate /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;
# 
#     location / {
#         proxy_pass http://laas_frontend;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
# 
#     location /api {
#         proxy_pass http://laas_backend;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
# 
#     location /auth {
#         proxy_pass http://laas_keycloak;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
# }
EOF

# Test and reload Nginx
nginx -t
systemctl reload nginx
```

### Step 8.2 - Setup SSL with Let's Encrypt (Optional)

```bash
# Install Certbot
dnf install -y certbot python3-certbot-nginx

# Obtain SSL certificate (replace with your domain)
certbot --nginx -d yourdomain.com

# Auto-renewal
systemctl enable certbot-renew.timer
```

### Step 8.3 - Secure Common Services

```bash
# Disable unused services
systemctl stop postgresql  # Only if remote DB
systemctl disable postgresql

# Setup fail2ban for SSH protection
dnf install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Create fail2ban config
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/secure
EOF

systemctl restart fail2ban
```

---

## Phase 9: Verification & Testing

### Step 9.1 - Verify All Services

```bash
# Check all services status
systemctl status laas-backend
systemctl status nginx
systemctl status docker
pm2 status

# Check listening ports
ss -tlnp | grep -E ':(3000|3001|8080|5432|9998|9999)\s'
```

### Step 9.2 - Test Authentication Flow

1. Open browser: `http://YOUR_SERVER_IP:3000`
2. Try sign up with email/password
3. Check email for OTP verification
4. Test Google/GitHub OAuth
5. Test institution SSO with LaaS Academy

### Step 9.3 - Test Backend API

```bash
# Test user registration (example)
curl -X POST http://localhost:3001/auth/check-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Health check
curl http://localhost:3001/health
```

### Step 9.4 - Check Logs

```bash
# Backend logs
journalctl -u laas-backend -f

# Frontend logs
pm2 logs laas-frontend

# Docker logs (Keycloak, Monitoring)
docker compose -f /opt/laas/keycloak/docker-compose.yml logs -f
docker compose -f /opt/laas/monitoring_setup_files/laas-monitoring/docker-compose.yml logs -f
```

---

## Quick Reference Commands

```bash
# Start all services
systemctl start laas-backend
pm2 restart laas-frontend
cd /opt/laas/keycloak && docker compose start
cd /opt/laas/monitoring_setup_files/laas-monitoring && docker compose start

# Stop all services
systemctl stop laas-backend
pm2 stop laas-frontend
cd /opt/laas/keycloak && docker compose stop

# Restart backend
systemctl restart laas-backend

# View backend logs
journalctl -u laas-backend -f

# Database backup
pg_dump -U laasuser -h localhost laas > laas_backup_$(date +%Y%m%d).sql

# Restore database
psql -U laasuser -h localhost laas < laas_backup_20260327.sql
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Backend won't start | Check `.env` file and database connection |
| Keycloak 404 | Ensure realm name is exactly `laas` |
| OAuth not working | Verify redirect URIs in Keycloak clients |
| Database connection failed | Check PostgreSQL is running and credentials |
| Frontend 500 error | Check backend API is running on port 3001 |
| CORS errors | Verify CORS_ORIGIN matches frontend URL |

### Firewall Issues

```bash
# Check if ports are open
firewall-cmd --list-ports

# Temporarily disable firewall for testing
systemctl stop firewalld

# Re-enable after testing
systemctl start firewalld
```

### SELinux Issues

```bash
# Check SELinux status
getenforce

# Temporarily set to permissive for testing
setenforce 0

# Make permanent (if needed)
vi /etc/selinux/config
# Set SELINUX=permissive

# For nginx/HTTP
setsebool -P httpd_can_network_connect 1
```

---

## Support

For detailed SSO configuration, see:
- `docs/keycloak-laas-academy-setup.md` - Complete SSO setup guide
- `ReadMe/Auth-and-Storage-Architecture.md` - Auth flow documentation
- `ReadMe/Storage-Provisioning-Setup.md` - Storage setup guide
