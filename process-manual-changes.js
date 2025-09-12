const admin = require('firebase-admin');

// Initialize Firebase Admin using the service account file
if (!admin.apps.length) {
  try {
    const serviceAccount = require('./datarefinery-6db5e-firebase-adminsdk-fbsvc-408eea0d7c.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'datarefinery-6db5e'
    });
    console.log('✅ Firebase Admin initialized with service account');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function processManualChanges() {
  try {
    console.log('🔍 Processing manually changed completed tasks...');

    // Get all completed tasks
    const completedTasksQuery = await db.collection('tasks')
      .where('status', '==', 'completed')
      .get();

    if (completedTasksQuery.empty) {
      console.log('ℹ️ No completed tasks found');
      return;
    }

    console.log(`📋 Found ${completedTasksQuery.docs.length} completed tasks`);

    let processedCount = 0;
    let skippedCount = 0;

    for (const taskDoc of completedTasksQuery.docs) {
      const taskData = taskDoc.data();
      const taskId = taskDoc.id;
      const userId = taskData.completedBy;

      if (!userId) {
        console.log('⚠️ Task has no completedBy field:', taskId);
        continue;
      }

      console.log(`\n🔄 Processing task: ${taskData.title} (${taskId})`);
      console.log(`   User: ${userId}`);
      console.log(`   Points: ${taskData.bountyPoints}`);

      // Check if points were already awarded for this task
      const pointsTransactionQuery = await db.collection('user_points_transactions')
        .where('taskId', '==', taskId)
        .where('userId', '==', userId)
        .where('type', '==', 'earned')
        .get();

      if (!pointsTransactionQuery.empty) {
        console.log('ℹ️ Points already awarded for this task');
        skippedCount++;
        continue;
      }

      // Award points for this task
      const userPointsRef = db.collection('user_points').doc(userId);
      
      await db.runTransaction(async (transaction) => {
        const userPointsDoc = await transaction.get(userPointsRef);
        
        if (userPointsDoc.exists) {
          // User already has a points document, update it
          const currentData = userPointsDoc.data();
          if (currentData) {
            const newTotalPoints = (currentData.totalPoints || 0) + taskData.bountyPoints;
            const newAvailablePoints = (currentData.availablePoints || 0) + taskData.bountyPoints;
            
            transaction.update(userPointsRef, {
              totalPoints: newTotalPoints,
              availablePoints: newAvailablePoints,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`✅ Points updated: +${taskData.bountyPoints} (Total: ${newTotalPoints}, Available: ${newAvailablePoints})`);
          }
        } else {
          // User has no points document, create one
          transaction.set(userPointsRef, {
            userId: userId,
            totalPoints: taskData.bountyPoints,
            availablePoints: taskData.bountyPoints,
            spentPoints: 0,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`✅ New user points document created: ${taskData.bountyPoints} points`);
        }
      });

      // Create a points transaction record for tracking
      await db.collection('user_points_transactions').add({
        userId: userId,
        taskId: taskId,
        amount: taskData.bountyPoints,
        type: 'earned',
        description: `Completed task: ${taskData.title}`,
        category: taskData.category,
        difficulty: taskData.difficulty,
        completedBy: 'manual',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('✅ Points transaction recorded');
      processedCount++;
    }

    console.log(`\n🎉 Processing completed!`);
    console.log(`   Total tasks: ${completedTasksQuery.docs.length}`);
    console.log(`   Processed: ${processedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log('🔄 Please refresh your app to see the updated points.');

  } catch (error) {
    console.error('❌ Error processing manual changes:', error);
  } finally {
    process.exit(0);
  }
}

// Check if a specific task ID was provided
const taskId = process.argv[2];
if (taskId) {
  console.log(`🔍 Processing specific task: ${taskId}`);
  // Process specific task logic would go here
} else {
  processManualChanges();
}
