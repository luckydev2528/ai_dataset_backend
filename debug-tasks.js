// Load environment variables first
require('dotenv').config();

const admin = require('firebase-admin');

console.log('Environment check:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Not set');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set');

// Initialize Firebase Admin
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    console.log('Firebase Admin initialized successfully');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  process.exit(1);
}

const db = admin.firestore();

async function debugTasks() {
  try {
    console.log('=== Debug Tasks API Issue ===\n');

    // Test 1: Get all tasks directly from Firestore
    console.log('1. Getting all tasks directly from Firestore...');
    const allTasksSnapshot = await db.collection('tasks').get();
    console.log(`Found ${allTasksSnapshot.size} tasks in Firestore`);
    
    allTasksSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.title}: status=${data.status}, isActive=${data.isActive}, expiryDate=${data.expiryDate?.toDate()}`);
    });

    // Test 2: Test filtering by status and isActive
    console.log('\n2. Filtering by status=active and isActive=true...');
    const activeTasksQuery = db.collection('tasks')
      .where('status', '==', 'active')
      .where('isActive', '==', true);
    
    const activeTasksSnapshot = await activeTasksQuery.get();
    console.log(`Found ${activeTasksSnapshot.size} active tasks`);
    
    const now = new Date();
    let nonExpiredCount = 0;
    
    activeTasksSnapshot.forEach(doc => {
      const data = doc.data();
      const expiryDate = data.expiryDate?.toDate();
      const isExpired = expiryDate && expiryDate < now;
      if (!isExpired) nonExpiredCount++;
      console.log(`- ${data.title}: expired=${isExpired}, expiryDate=${expiryDate}`);
    });
    
    console.log(`Non-expired active tasks: ${nonExpiredCount}`);

    console.log('\n=== Debug Complete ===');
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugTasks().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script error:', error);
  process.exit(1);
});
