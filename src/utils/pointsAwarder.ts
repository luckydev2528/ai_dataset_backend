import admin from 'firebase-admin';
import { getFirestore } from '../services/auth/firebaseAdmin';
import { Logger } from './logger';

const db = getFirestore()!;

/**
 * Automatically award points to user when a task is completed
 * This function should be called whenever a task status changes to 'completed'
 */
export async function awardPointsForCompletedTask(
  taskId: string,
  userId: string,
  bountyPoints: number,
  taskCategory: string,
  taskDifficulty: string,
  completedBy: string
): Promise<boolean> {
  try {
    Logger.info('🎯 Awarding points for completed task', {
      taskId,
      userId,
      bountyPoints,
      taskCategory,
      taskDifficulty,
      completedBy
    });

    const userPointsRef = db.collection('user_points').doc(userId);
    
    await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
      const userPointsDoc = await transaction.get(userPointsRef);
      
      if (userPointsDoc.exists) {
        // User already has a points document, update it
        const currentData = userPointsDoc.data();
        if (currentData) {
          const newTotalPoints = (currentData.totalPoints || 0) + bountyPoints;
          const newAvailablePoints = (currentData.availablePoints || 0) + bountyPoints;
          
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
            pointsAwarded: bountyPoints
          });
        }
      } else {
        // User has no points document, create one
        transaction.set(userPointsRef, {
          userId: userId,
          totalPoints: bountyPoints,
          availablePoints: bountyPoints,
          spentPoints: 0,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        Logger.info('✅ New user points document created', {
          userId,
          totalPoints: bountyPoints,
          availablePoints: bountyPoints
        });
      }
    });

    // Also create a points transaction record for tracking
    await db.collection('user_points_transactions').add({
      userId: userId,
      taskId: taskId,
      amount: bountyPoints,
      type: 'earned',
      description: `Completed task: ${taskId}`,
      category: taskCategory,
      difficulty: taskDifficulty,
      completedBy: completedBy,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    Logger.info('🎉 Points successfully awarded for completed task', {
      taskId,
      userId,
      bountyPoints,
      taskCategory,
      taskDifficulty
    });

    return true;

  } catch (error) {
    Logger.error('❌ Failed to award points for completed task', {
      error: (error as Error).message,
      taskId,
      userId,
      bountyPoints
    });
    return false;
  }
}

/**
 * Process all completed tasks that haven't had points awarded yet
 * This can be used to fix existing completed tasks
 */
export async function processCompletedTasksWithoutPoints(): Promise<void> {
  try {
    Logger.info('🔍 Processing completed tasks without points...');

    // Get all completed tasks
    const completedTasksQuery = await db.collection('tasks')
      .where('status', '==', 'completed')
      .get();

    if (completedTasksQuery.empty) {
      Logger.info('ℹ️ No completed tasks found');
      return;
    }

    Logger.info(`📋 Found ${completedTasksQuery.docs.length} completed tasks`);

    for (const taskDoc of completedTasksQuery.docs) {
      const taskData = taskDoc.data();
      const taskId = taskDoc.id;
      const userId = taskData.completedBy;

      if (!userId) {
        Logger.warning('⚠️ Task has no completedBy field', { taskId });
        continue;
      }

      // Check if points were already awarded for this task
      const pointsTransactionQuery = await db.collection('user_points_transactions')
        .where('taskId', '==', taskId)
        .where('userId', '==', userId)
        .where('type', '==', 'earned')
        .get();

      if (!pointsTransactionQuery.empty) {
        Logger.info('ℹ️ Points already awarded for this task', { taskId, userId });
        continue;
      }

      // Award points for this task
      const success = await awardPointsForCompletedTask(
        taskId,
        userId,
        taskData.bountyPoints,
        taskData.category,
        taskData.difficulty,
        taskData.completedBy || 'system'
      );

      if (success) {
        Logger.info('✅ Successfully processed task', { taskId, userId });
      } else {
        Logger.error('❌ Failed to process task', { taskId, userId });
      }
    }

    Logger.info('🎉 Completed processing all completed tasks');

  } catch (error) {
    Logger.error('❌ Error processing completed tasks', {
      error: (error as Error).message
    });
  }
}
