 const redis = require('redis');
require('dotenv').config();

async function checkSessions() {
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
  });
  
  try {
    await client.connect();
    const keys = await client.keys('drr:session:*');
    console.log('Found', keys.length, 'session keys');
    
    // Check first few sessions
    for (let i = 0; i < Math.min(3, keys.length); i++) {
      const key = keys[i];
      const data = await client.get(key);
      if (data) {
        const sessionData = JSON.parse(data);
        console.log('Key:', key);
        console.log('UserID:', sessionData.userId);
        console.log('DeviceID:', sessionData.deviceId);
        console.log('IsActive:', sessionData.isActive);
        console.log('---');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.quit();
  }
}

checkSessions();