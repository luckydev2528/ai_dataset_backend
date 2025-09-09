# 🔴 Redis Integration Guide

## Overview

This document outlines the comprehensive Redis integration implemented throughout the DRR Backend API for improved performance, scalability, and production readiness.

## 🚀 Redis Features Implemented

### 1. **Token Management**
- **JWT Token Blacklisting**: Revoked tokens stored in Redis with TTL
- **Refresh Token Storage**: Secure storage with automatic expiration
- **Token Rotation**: Automatic cleanup of old tokens
- **Device-Based Tokens**: Support for multi-device authentication

### 2. **Session Management**
- **Distributed Sessions**: All session data stored in Redis
- **Multi-Device Support**: Track sessions across multiple devices
- **Session Revocation**: Instant session invalidation
- **Automatic Cleanup**: TTL-based session expiration

### 3. **Rate Limiting**
- **Redis-Based Rate Limiting**: Distributed rate limiting across instances
- **Sliding Window Algorithm**: More precise rate limiting
- **Per-User Rate Limiting**: Individual user rate limits
- **API Key Rate Limiting**: Support for API key-based limits

### 4. **Caching System**
- **User Data Caching**: Cache frequently accessed user data
- **Firebase User Caching**: Reduce Firebase API calls
- **API Response Caching**: Cache expensive API responses
- **Configuration Caching**: Cache app configuration data

### 5. **Performance Optimization**
- **Connection Pooling**: Efficient Redis connection management
- **Pipeline Operations**: Batch Redis operations for better performance
- **Background Refresh**: Proactive cache refresh
- **Health Monitoring**: Redis health checks and metrics

## 📋 Redis Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Redis Services                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Token     │  │   Session   │  │    Rate Limiting    │ │
│  │ Management  │  │ Management  │  │                     │ │
│  │             │  │             │  │  • General Limits   │ │
│  │ • Blacklist │  │ • Storage   │  │  • Auth Limits      │ │
│  │ • Refresh   │  │ • Tracking  │  │  • User Limits      │ │
│  │ • Rotation  │  │ • Revoke    │  │  • API Key Limits   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Caching   │  │ Health &    │  │   Configuration     │ │
│  │   System    │  │ Monitoring  │  │                     │ │
│  │             │  │             │  │  • Environment      │ │
│  │ • User Data │  │ • Health    │  │  • App Settings     │ │
│  │ • API Cache │  │ • Metrics   │  │  • Feature Flags    │ │
│  │ • Config    │  │ • Stats     │  │  • Warm-up          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## ⚙️ Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
REDIS_KEY_PREFIX=drr:

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=10

# JWT Configuration (shortened for Redis-based tokens)
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=30d
```

### Redis Key Structure

```
drr:blacklist:{token_hash}          # Blacklisted JWT tokens
drr:refresh_token:{token_id}        # Refresh token metadata
drr:session:{session_id}            # Session data
drr:rate_limit:{key}                # Rate limiting counters
drr:cache:{key}                     # Cached data
drr:user:{user_id}                  # User data cache
drr:firebase_user:{uid}             # Firebase user cache
drr:config:{config_key}             # Configuration cache
```

## 🔧 Implementation Details

### 1. RedisService Class

```typescript
// Core Redis operations
export class RedisService {
  // Connection management
  connect(): Promise<void>
  disconnect(): Promise<void>
  isReady(): boolean
  
  // Token operations
  addToBlacklist(token: string, ttl: number): Promise<void>
  isBlacklisted(token: string): Promise<boolean>
  storeRefreshToken(tokenId: string, data: any, ttl: number): Promise<void>
  
  // Session operations
  storeSession(sessionId: string, data: any, ttl: number): Promise<void>
  getSession(sessionId: string): Promise<any>
  updateSession(sessionId: string, updates: any): Promise<void>
  
  // Rate limiting
  incrementRateLimit(key: string, windowMs: number, max: number): Promise<RateLimitResult>
  
  // Caching
  set(key: string, value: any, ttl?: number): Promise<void>
  get<T>(key: string): Promise<T | null>
  del(key: string): Promise<void>
  
  // Health monitoring
  healthCheck(): Promise<HealthResult>
}
```

### 2. JWTService Integration

```typescript
export class JWTService {
  // Now uses Redis for token blacklisting
  static async verifyToken(token: string): Promise<JWTPayload>
  static async revokeToken(token: string): Promise<void>
  static async generateRefreshToken(user: User): Promise<string>
  static async refreshAccessToken(refreshToken: string): Promise<TokenPair>
}
```

### 3. SessionService Integration

```typescript
export class SessionService {
  // All session operations now use Redis
  static async createSession(userId: string, deviceId: string): Promise<string>
  static async getUserSessions(userId: string): Promise<SessionInfo[]>
  static async revokeSession(sessionId: string): Promise<boolean>
  static async revokeAllUserSessions(userId: string): Promise<number>
}
```

### 4. CacheService

```typescript
export class CacheService {
  // Intelligent caching with background refresh
  static async cacheWithRefresh<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl: number
  ): Promise<T>
  
  // Specialized caching methods
  static async cacheUser(userId: string, userData: any): Promise<void>
  static async cacheFirebaseUser(uid: string, data: any): Promise<void>
  static async cacheApiResponse(endpoint: string, data: any): Promise<void>
}
```

## 🛠️ Installation & Setup

### 1. Install Redis

#### Using Docker
```bash
docker run --name redis -p 6379:6379 -d redis:7-alpine
```

#### Using Package Manager (Ubuntu)
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Using Homebrew (macOS)
```bash
brew install redis
brew services start redis
```

### 2. Install Node.js Dependencies

```bash
cd datarefining-backend
npm install redis ioredis
```

### 3. Environment Configuration

```bash
# Copy and configure environment variables
cp env.example .env

# Edit .env file with your Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password
REDIS_DB=0
```

### 4. Start the Application

```bash
npm run dev
```

## 📊 Monitoring & Metrics

### Health Check Endpoint

```bash
curl http://localhost:3001/health
```

Response includes Redis health:
```json
{
  "status": "OK",
  "services": {
    "redis": {
      "status": "healthy",
      "latency": 2
    },
    "cache": {
      "totalKeys": 1247,
      "memoryUsage": "2.1M",
      "hitRate": "94.5%"
    }
  }
}
```

### Cache Statistics

The system provides detailed cache statistics:
- **Total Keys**: Number of keys in Redis
- **Memory Usage**: Redis memory consumption
- **Hit Rate**: Cache hit percentage
- **Latency**: Redis response time

## 🚀 Production Deployment

### 1. Redis Configuration

For production, use a managed Redis service or configure Redis with:

```bash
# redis.conf
bind 127.0.0.1
port 6379
requirepass your_strong_password
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 2. High Availability Setup

Consider Redis Cluster or Sentinel for production:

```bash
# Redis Cluster
REDIS_HOST=redis-cluster.example.com
REDIS_PORT=6379

# Redis Sentinel
REDIS_SENTINELS=sentinel1:26379,sentinel2:26379,sentinel3:26379
REDIS_MASTER_NAME=mymaster
```

### 3. Monitoring

Use Redis monitoring tools:
- **Redis Insight**: GUI for Redis management
- **Prometheus + Grafana**: Metrics and dashboards
- **CloudWatch/DataDog**: Cloud monitoring

### 4. Backup Strategy

```bash
# Automated backups
redis-cli --rdb /backup/redis-backup-$(date +%Y%m%d).rdb

# Continuous backup with AOF
appendonly yes
appendfilename "appendonly.aof"
```

## 🔐 Security Considerations

### 1. Authentication
```bash
# Use strong passwords
requirepass your_very_strong_password_here

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
```

### 2. Network Security
```bash
# Bind to specific interfaces
bind 127.0.0.1 10.0.0.1

# Use TLS encryption
tls-port 6380
tls-cert-file redis.crt
tls-key-file redis.key
```

### 3. Access Control
```bash
# Redis 6+ ACL
user default off
user app_user on >app_password ~* +@all -@dangerous
```

## 📈 Performance Optimization

### 1. Connection Pooling

```typescript
const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  connectTimeout: 10000,
  commandTimeout: 5000,
};
```

### 2. Pipeline Operations

```typescript
// Batch operations for better performance
const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.incr('counter');
await pipeline.exec();
```

### 3. Memory Optimization

```bash
# Configure memory policies
maxmemory 2gb
maxmemory-policy allkeys-lru

# Use appropriate data structures
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
```

## 🔄 Migration Guide

### From In-Memory to Redis

1. **Backup existing data** (if any)
2. **Update environment variables**
3. **Deploy new version with Redis integration**
4. **Verify all services are working**
5. **Monitor performance and errors**

### Rollback Plan

1. Keep the previous version ready
2. Have database backups
3. Monitor error rates
4. Quick rollback procedure documented

## 🎯 Benefits Achieved

### ✅ **Scalability**
- **Horizontal Scaling**: Multiple app instances share Redis state
- **Load Distribution**: Redis handles high-throughput operations
- **Memory Efficiency**: Shared cache across instances

### ✅ **Performance**
- **Faster Authentication**: Cached user data reduces database calls
- **Efficient Rate Limiting**: Redis-based counters with atomic operations
- **Reduced Latency**: Local cache with background refresh

### ✅ **Reliability**
- **Persistent Sessions**: Sessions survive app restarts
- **Distributed State**: No single point of failure for session data
- **Graceful Degradation**: Fail-open behavior when Redis is unavailable

### ✅ **Security**
- **Token Blacklisting**: Instantly revoke compromised tokens
- **Session Management**: Fine-grained session control
- **Rate Limiting**: Prevent abuse and DDoS attacks

## 🎉 **Redis Integration Complete!** ✅

Your application now uses Redis for:
- ✅ **Token Blacklisting & Management**
- ✅ **Distributed Session Storage**
- ✅ **High-Performance Rate Limiting**
- ✅ **Intelligent Caching System**
- ✅ **Health Monitoring & Metrics**
- ✅ **Production-Ready Scalability**

The system is now **production-ready** with enterprise-grade Redis integration! 🚀

