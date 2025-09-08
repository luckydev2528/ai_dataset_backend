const admin = require('firebase-admin');
const serviceAccount = require('./datarefinery-6db5e-firebase-adminsdk-fbsvc-408eea0d7c.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function testUserPoints() {
  try {
    console.log('🔍 Testing user points in Firestore...');

    // Get all user points
    const userPointsSnapshot = await db.collection('user_points').get();
    console.log(`📊 Total user points documents: ${userPointsSnapshot.size}`);

    if (userPointsSnapshot.empty) {
      console.log('❌ No user points found in collection');
      return;
    }

    // List all user points
    userPointsSnapshot.forEach(doc => {
      const userPoints = doc.data();
      console.log(`\n💰 User Points for ${userPoints.userId}:`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Total Points: ${userPoints.totalPoints}`);
      console.log(`   Available Points: ${userPoints.availablePoints}`);
      console.log(`   Spent Points: ${userPoints.spentPoints}`);
      console.log(`   Last Updated: ${userPoints.lastUpdated?.toDate?.() || userPoints.lastUpdated}`);
      console.log(`   Created At: ${userPoints.createdAt?.toDate?.() || userPoints.createdAt}`);
      console.log(`   Updated At: ${userPoints.updatedAt?.toDate?.() || userPoints.updatedAt}`);
    });

    // Test points history
    console.log('\n📊 Testing points history...');
    const historySnapshot = await db.collection('points_history').get();
    console.log(`📈 Total points history entries: ${historySnapshot.size}`);

    if (historySnapshot.size > 0) {
      historySnapshot.forEach(doc => {
        const transaction = doc.data();
        console.log(`   - ${transaction.type}: ${transaction.amount} points (${transaction.description})`);
      });
    }

  } catch (error) {
    console.error('❌ Error testing user points:', error);
  } finally {
    process.exit(0);
  }
}

testUserPoints();
