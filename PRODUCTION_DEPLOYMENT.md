# 🚀 Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the DRR Backend API to production with maximum security and reliability.

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Copy `env.example` to `.env`
- [ ] Generate strong JWT secrets (32+ characters)
- [ ] Configure production Firebase project
- [ ] Set production CORS origins
- [ ] Configure rate limiting for your needs

### 2. Security Configuration
- [ ] Change all default passwords and secrets
- [ ] Use environment-specific Firebase service accounts
- [ ] Enable HTTPS only
- [ ] Configure secure headers
- [ ] Set up proper logging

### 3. Dependencies
- [ ] Update all dependencies to latest versions
- [ ] Run security audit: `npm audit`
- [ ] Fix any high/critical vulnerabilities

## 🔧 Environment Setup

### Required Environment Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=3001

# Security - CHANGE THESE!
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters-long
REFRESH_TOKEN_SECRET=your-refresh-token-secret-different-from-jwt-secret-64-characters-minimum

# Firebase Production Configuration
FIREBASE_PROJECT_ID=your-production-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour production private key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-production-project-id.iam.gserviceaccount.com

# CORS - Only your production domains
CORS_ORIGIN=https://yourapp.com,https://www.yourapp.com

# Rate Limiting (adjust as needed)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=10
```

### Generate Secure Secrets

```bash
# Generate JWT secret (32+ characters)
openssl rand -base64 32

# Generate refresh token secret (64+ characters)
openssl rand -base64 64
```

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY --chown=nodejs:nodejs . .

# Build the application
RUN npm run build

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"]
```

### Docker Compose (Production)
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - app-network

  # Optional: Redis for token blacklist (recommended for production)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

## ☁️ Cloud Deployment Options

### 1. Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET="your-jwt-secret"
heroku config:set REFRESH_TOKEN_SECRET="your-refresh-secret"
heroku config:set FIREBASE_PROJECT_ID="your-project-id"
# ... set all other environment variables

# Deploy
git push heroku main
```

### 2. AWS ECS Deployment

```bash
# Build and push Docker image
docker build -t your-app .
docker tag your-app:latest your-account.dkr.ecr.region.amazonaws.com/your-app:latest
docker push your-account.dkr.ecr.region.amazonaws.com/your-app:latest

# Deploy using ECS task definition
```

### 3. Google Cloud Run

```bash
# Build and deploy
gcloud run deploy drr-backend \
  --image gcr.io/your-project/drr-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,JWT_SECRET=your-secret
```

### 4. DigitalOcean App Platform

```yaml
# .do/app.yaml
name: drr-backend
services:
- name: api
  source_dir: /
  github:
    repo: your-username/your-repo
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: JWT_SECRET
    value: your-jwt-secret
    type: SECRET
  routes:
  - path: /
```

## 🔒 Security Hardening

### 1. Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name yourapi.com;

    # SSL Configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 3001/tcp   # Block direct access to app
```

### 3. Fail2Ban Configuration

```ini
# /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-rate-limit]
enabled = true
filter = nginx-rate-limit
logpath = /var/log/nginx/error.log
maxretry = 2
```

## 📊 Monitoring & Logging

### 1. Application Monitoring

```javascript
// Add to your production app
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'drr-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### 2. Health Checks

```javascript
// Enhanced health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    // Add more checks as needed
    services: {
      firebase: 'OK', // Check Firebase connection
      database: 'OK', // Check database connection
    }
  };

  res.status(200).json(health);
});
```

### 3. Error Tracking

Consider integrating with:
- **Sentry**: For error tracking and performance monitoring
- **LogRocket**: For session replay and debugging
- **DataDog**: For comprehensive monitoring

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm audit

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "your-app-name"
          heroku_email: "your-email@example.com"
```

## 🚨 Incident Response

### 1. Security Breach Response

```bash
# Immediate actions
1. Revoke all user sessions
2. Rotate JWT secrets
3. Check logs for suspicious activity
4. Notify users if necessary
5. Apply security patches

# Commands to revoke all sessions
curl -X POST https://your-api.com/api/auth/sessions/revoke-all \
  -H "Authorization: Bearer admin-token"
```

### 2. Performance Issues

```bash
# Check system resources
htop
df -h
free -h

# Check application logs
tail -f logs/combined.log | grep ERROR

# Monitor API responses
curl -w "@curl-format.txt" -s -o /dev/null https://your-api.com/health
```

## 📈 Scaling Considerations

### 1. Horizontal Scaling
- Use load balancer (Nginx, AWS ALB)
- Implement session affinity if needed
- Use Redis for shared token blacklist

### 2. Database Scaling
- Consider implementing Redis for session storage
- Use database connection pooling
- Implement read replicas if needed

### 3. Caching Strategy
- Implement Redis for token blacklist
- Cache frequently accessed data
- Use CDN for static assets

## 🔐 Backup & Recovery

### 1. Data Backup
```bash
# Backup Firebase data
firebase use production
firebase firestore:export gs://your-backup-bucket/$(date +%Y-%m-%d)

# Backup environment variables
echo "# Backup created on $(date)" > env-backup.txt
env | grep -E "(JWT_|FIREBASE_|CORS_)" >> env-backup.txt
```

### 2. Disaster Recovery
1. Keep environment variables in secure vault
2. Maintain infrastructure as code
3. Test recovery procedures regularly
4. Document all processes

---

## ✅ Post-Deployment Verification

### 1. Functionality Tests
```bash
# Health check
curl https://your-api.com/health

# Authentication test
curl -X POST https://your-api.com/api/auth/social \
  -H "Content-Type: application/json" \
  -d '{"idToken":"test-token","provider":"google"}'

# Rate limiting test
for i in {1..15}; do curl https://your-api.com/api/auth/verify; done
```

### 2. Security Tests
- Run security scan (OWASP ZAP, Nessus)
- Test SSL configuration (SSL Labs)
- Verify security headers
- Test rate limiting
- Verify CORS configuration

### 3. Performance Tests
- Load testing (Artillery, JMeter)
- Monitor response times
- Check memory usage
- Verify auto-scaling

---

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Monitoring setup
- [ ] Logging configured
- [ ] Backup procedures in place
- [ ] Incident response plan ready
- [ ] Performance testing completed
- [ ] Security testing completed
- [ ] Documentation updated
- [ ] Team trained on operations

**Your authentication system is now production-ready! 🚀**

