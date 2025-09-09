 const redis = require('redis');
require('dotenv').config();

async function clearOldSessions() {
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
  });
  
  try {
    await client.connect();
    console.log('Connected to Redis');
    
    // Get all session keys
    const keys = await client.keys('drr:session:*');
    console.log(`Found ${keys.length} session keys`);
    
    if (keys.length > 0) {
      // Delete all session keys
      const deleted = await client.del(keys);
      console.log(`✅ Deleted ${deleted} old session keys`);
    } else {
      console.log('No session keys found to delete');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.quit();
  }
}

clearOldSessions();