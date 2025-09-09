const redis = require('redis');
require('dotenv').config();

async function clearRateLimit() {
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
  });
  
  try {
    console.log('Connecting to Redis...');
    await client.connect();
    console.log('Connected successfully!');
    
    // Check all rate limit keys
    const allKeys = await client.keys('*');
    console.log('All Redis keys:', allKeys);
    
    // Check specific rate limit keys
    const rateLimitKeys = await client.keys('rate_limit:*');
    console.log('Rate limit keys:', rateLimitKeys);
    
    // Check auth rate limit specifically (with drr: prefix)
    const authKey = 'drr:rate_limit:auth:::ffff:127.0.0.1';
    const generalKey = 'drr:rate_limit:general:::ffff:127.0.0.1';
    
    const authTtl = await client.ttl(authKey);
    const authCount = await client.get(authKey);
    const generalTtl = await client.ttl(generalKey);
    const generalCount = await client.get(generalKey);
    
    console.log(`\nAuth rate limit (${authKey}):`);
    console.log('TTL:', authTtl);
    console.log('Count:', authCount);
    
    console.log(`\nGeneral rate limit (${generalKey}):`);
    console.log('TTL:', generalTtl);
    console.log('Count:', generalCount);
    
    // Clear both rate limits
    if (authTtl !== -2) {
      console.log('\nClearing auth rate limit...');
      await client.del(authKey);
      console.log('✅ Auth rate limit cleared!');
    } else {
      console.log('✅ No active auth rate limit found');
    }
    
    if (generalTtl !== -2) {
      console.log('\nClearing general rate limit...');
      await client.del(generalKey);
      console.log('✅ General rate limit cleared!');
    } else {
      console.log('✅ No active general rate limit found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.quit();
  }
}

clearRateLimit();