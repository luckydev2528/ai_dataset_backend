const admin = require('firebase-admin');
const serviceAccount = require('./datarefinery-6db5e-firebase-adminsdk-fbsvc-408eea0d7c.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function testTasks() {
  try {
    console.log('🔍 Testing tasks in Firestore...');

    // Get all tasks
    const tasksSnapshot = await db.collection('tasks').get();
    console.log(`📊 Total tasks in collection: ${tasksSnapshot.size}`);

    if (tasksSnapshot.empty) {
      console.log('❌ No tasks found in collection');
      return;
    }

    // List all tasks
    tasksSnapshot.forEach(doc => {
      const task = doc.data();
      console.log(`\n📝 Task: ${task.title}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   IsActive: ${task.isActive}`);
      console.log(`   ExpiryDate: ${task.expiryDate?.toDate?.() || task.expiryDate}`);
      console.log(`   CreatedAt: ${task.createdAt?.toDate?.() || task.createdAt}`);
    });

    // Test active tasks query
    console.log('\n🔍 Testing active tasks query...');
    const now = new Date();
    const activeTasksSnapshot = await db.collection('tasks')
      .where('status', '==', 'active')
      .where('isActive', '==', true)
      .where('expiryDate', '>', now)
      .get();

    console.log(`✅ Active tasks found: ${activeTasksSnapshot.size}`);

    activeTasksSnapshot.forEach(doc => {
      const task = doc.data();
      console.log(`   - ${task.title} (expires: ${task.expiryDate?.toDate?.() || task.expiryDate})`);
    });

  } catch (error) {
    console.error('❌ Error testing tasks:', error);
  } finally {
    process.exit(0);
  }
}

testTasks();
