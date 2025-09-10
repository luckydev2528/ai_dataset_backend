const redis = require('redis');
require('dotenv').config();

async function clearAllRateLimits() {
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
  });
  
  try {
    console.log('🔗 Connecting to Redis...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Get all rate limit keys (both patterns)
    const allKeys = await client.keys('*');
    const rateLimitKeys = allKeys.filter(key => 
      key.includes('rate_limit') || 
      key.includes('drr:rate_limit')
    );
    
    console.log(`\n🔍 Found ${rateLimitKeys.length} rate limit keys:`);
    rateLimitKeys.forEach(key => console.log(`  - ${key}`));
    
    if (rateLimitKeys.length === 0) {
      console.log('✅ No rate limit keys found - all clear!');
      return;
    }
    
    // Clear all rate limit keys
    console.log('\n🧹 Clearing all rate limit keys...');
    for (const key of rateLimitKeys) {
      const ttl = await client.ttl(key);
      const count = await client.get(key);
      console.log(`  - ${key}: TTL=${ttl}, Count=${count}`);
      
      await client.del(key);
      console.log(`    ✅ Cleared!`);
    }
    
    console.log('\n🎉 All rate limits cleared successfully!');
    
    // Also clear any session-related keys that might be causing issues
    const sessionKeys = allKeys.filter(key => key.includes('session'));
    if (sessionKeys.length > 0) {
      console.log(`\n🧹 Found ${sessionKeys.length} session keys, clearing them too...`);
      for (const key of sessionKeys) {
        await client.del(key);
        console.log(`  ✅ Cleared session: ${key}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.quit();
    console.log('👋 Disconnected from Redis');
  }
}

clearAllRateLimits();
