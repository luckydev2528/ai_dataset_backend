import admin from 'firebase-admin';
import { getFirestore } from '../services/auth/firebaseAdmin';
import { Logger } from './logger';

const db = getFirestore()!;

/**
 * Process all completed tasks that haven't had points awarded yet
 * This handles both API-approved and manually-approved tasks
 */
export async function processAllCompletedTasks(): Promise<void> {
  try {
    Logger.info('🔍 Processing all completed tasks for points...');

    // Get all completed tasks
    const completedTasksQuery = await db.collection('tasks')
      .where('status', '==', 'completed')
      .get();

    if (completedTasksQuery.empty) {
      Logger.info('ℹ️ No completed tasks found');
      return;
    }

    Logger.info(`📋 Found ${completedTasksQuery.docs.length} completed tasks`);

    let processedCount = 0;
    let skippedCount = 0;

    for (const taskDoc of completedTasksQuery.docs) {
      const taskData = taskDoc.data();
      const taskId = taskDoc.id;
      const userId = taskData.completedBy;

      if (!userId) {
        Logger.warning('⚠️ Task has no completedBy field', { taskId });
        continue;
      }

      Logger.info(`🔄 Processing task: ${taskData.title} (${taskId})`, {
        userId,
        bountyPoints: taskData.bountyPoints
      });

      // Check if points were already awarded for this task
      const pointsTransactionQuery = await db.collection('user_points_transactions')
        .where('taskId', '==', taskId)
        .where('userId', '==', userId)
        .where('type', '==', 'earned')
        .get();

      if (!pointsTransactionQuery.empty) {
        Logger.info('ℹ️ Points already awarded for this task', { taskId, userId });
        skippedCount++;
        continue;
      }

      // Award points for this task
      const success = await awardPointsForTask(taskId, userId, taskData, 'system');
      
      if (success) {
        processedCount++;
        Logger.info('✅ Successfully processed task', { taskId, userId });
      } else {
        Logger.error('❌ Failed to process task', { taskId, userId });
      }
    }

    Logger.info('🎉 Completed processing all completed tasks', {
      total: completedTasksQuery.docs.length,
      processed: processedCount,
      skipped: skippedCount
    });

  } catch (error) {
    Logger.error('❌ Error processing completed tasks', {
      error: (error as Error).message
    });
  }
}

/**
 * Award points for a specific completed task
 */
async function awardPointsForTask(
  taskId: string,
  userId: string,
  taskData: any,
  completedBy: string
): Promise<boolean> {
  try {
    const userPointsRef = db.collection('user_points').doc(userId);
    
    await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
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
          
          Logger.info('✅ Points updated for existing user', {
            userId,
            previousTotal: currentData.totalPoints || 0,
            previousAvailable: currentData.availablePoints || 0,
            newTotal: newTotalPoints,
            newAvailable: newAvailablePoints,
            pointsAwarded: taskData.bountyPoints
          });
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
        
        Logger.info('✅ New user points document created', {
          userId,
          totalPoints: taskData.bountyPoints,
          availablePoints: taskData.bountyPoints
        });
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
      completedBy: completedBy,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    Logger.info('✅ Points transaction recorded', { taskId, userId });

    return true;

  } catch (error) {
    Logger.error('❌ Failed to award points for task', {
      error: (error as Error).message,
      taskId,
      userId,
      bountyPoints: taskData.bountyPoints
    });
    return false;
  }
}

/**
 * Process a specific task by ID (for manual processing)
 */
export async function processSpecificTask(taskId: string): Promise<boolean> {
  try {
    Logger.info('🔍 Processing specific task', { taskId });

    const taskDoc = await db.collection('tasks').doc(taskId).get();
    
    if (!taskDoc.exists) {
      Logger.error('❌ Task not found', { taskId });
      return false;
    }

    const taskData = taskDoc.data();
    
    if (taskData?.status !== 'completed') {
      Logger.warning('⚠️ Task is not completed', { taskId, status: taskData?.status });
      return false;
    }

    const userId = taskData.completedBy;
    if (!userId) {
      Logger.error('❌ Task has no completedBy field', { taskId });
      return false;
    }

    // Check if points were already awarded
    const pointsTransactionQuery = await db.collection('user_points_transactions')
      .where('taskId', '==', taskId)
      .where('userId', '==', userId)
      .where('type', '==', 'earned')
      .get();

    if (!pointsTransactionQuery.empty) {
      Logger.info('ℹ️ Points already awarded for this task', { taskId, userId });
      return true;
    }

    // Award points
    const success = await awardPointsForTask(taskId, userId, taskData, 'manual');
    
    if (success) {
      Logger.info('✅ Successfully processed specific task', { taskId, userId });
    }

    return success;

  } catch (error) {
    Logger.error('❌ Error processing specific task', {
      error: (error as Error).message,
      taskId
    });
    return false;
  }
}
