const admin = require('firebase-admin');
const serviceAccount = require('./datarefinery-6db5e-firebase-adminsdk-fbsvc-408eea0d7c.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function testSimpleTasks() {
  try {
    console.log('🔍 Testing simple task query...');

    // Get all tasks with status 'active' only (no composite index needed)
    const tasksSnapshot = await db.collection('tasks')
      .where('status', '==', 'active')
      .get();

    console.log(`📊 Found ${tasksSnapshot.size} active tasks`);

    if (tasksSnapshot.empty) {
      console.log('❌ No active tasks found');
      return;
    }

    // List all active tasks
    tasksSnapshot.forEach(doc => {
      const task = doc.data();
      console.log(`\n📋 Task: ${task.title}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   IsActive: ${task.isActive}`);
      console.log(`   Expiry: ${task.expiryDate?.toDate?.() || task.expiryDate}`);
      console.log(`   Points: ${task.bountyPoints}`);
    });

    // Now test the filtering logic
    console.log('\n🔍 Testing filtering logic...');
    const now = new Date();
    console.log('Current time:', now);

    const validTasks = [];
    tasksSnapshot.forEach(doc => {
      const task = doc.data();
      
      // Convert Firestore Timestamp to Date if needed
      let expiryDate = task.expiryDate;
      if (expiryDate && typeof expiryDate === 'object' && 'toDate' in expiryDate && typeof expiryDate.toDate === 'function') {
        expiryDate = expiryDate.toDate();
      } else if (typeof expiryDate === 'string') {
        expiryDate = new Date(expiryDate);
      }
      
      const isNotExpired = expiryDate > now;
      const isActive = task.isActive !== false;
      const isValid = isNotExpired && isActive;
      
      console.log(`\n📋 ${task.title}:`);
      console.log(`   Expiry: ${expiryDate}`);
      console.log(`   Is not expired: ${isNotExpired}`);
      console.log(`   Is active: ${isActive}`);
      console.log(`   Valid: ${isValid}`);
      
      if (isValid) {
        validTasks.push({ id: doc.id, ...task });
      }
    });

    console.log(`\n✅ Final result: ${validTasks.length} valid tasks`);

  } catch (error) {
    console.error('❌ Error testing tasks:', error);
  } finally {
    process.exit(0);
  }
}

testSimpleTasks();
