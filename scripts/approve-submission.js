/*
 * Script: approve-submission.js
 * Purpose: Approve a user's submission for a given task and set reviewed fields
 * Usage examples:
 *   node scripts/approve-submission.js --taskId <TASK_ID> --userId <USER_ID>
 *   node scripts/approve-submission.js --submissionId <SUBMISSION_ID>
 *
 * Env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * Fallback: GOOGLE_APPLICATION_CREDENTIALS via Application Default Credentials
 */

const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--taskId') args.taskId = argv[++i];
    else if (a === '--userId') args.userId = argv[++i];
    else if (a === '--submissionId') args.submissionId = argv[++i];
    else if (a === '--reviewedBy') args.reviewedBy = argv[++i];
    else if (a === '--notes') args.notes = argv[++i];
  }
  return args;
}

async function initAdmin() {
  if (admin.apps.length > 0) return;

  const hasDirectCreds =
    !!process.env.FIREBASE_PROJECT_ID &&
    !!process.env.FIREBASE_CLIENT_EMAIL &&
    !!process.env.FIREBASE_PRIVATE_KEY;

  if (hasDirectCreds) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } else {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
}

async function findSubmission(db, { submissionId, taskId, userId }) {
  if (submissionId) {
    const doc = await db.collection('task_submissions').doc(submissionId).get();
    if (!doc.exists) throw new Error(`Submission not found for id=${submissionId}`);
    return { id: doc.id, ...doc.data() };
  }

  if (!taskId || !userId) {
    throw new Error('Provide either --submissionId or both --taskId and --userId');
  }

  const snap = await db
    .collection('task_submissions')
    .where('taskId', '==', taskId)
    .where('userId', '==', userId)
    .orderBy('submittedAt', 'desc')
    .limit(1)
    .get();

  if (snap.empty) throw new Error(`No submission found for taskId=${taskId} userId=${userId}`);
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function main() {
  try {
    const args = parseArgs(process.argv);
    await initAdmin();
    const db = admin.firestore();

    const submission = await findSubmission(db, args);
    const reviewedBy = args.reviewedBy || 'system-admin';
    const reviewNotes = args.notes || 'Approved via approve-submission.js';

    await db.collection('task_submissions').doc(submission.id).update({
      status: 'approved',
      reviewedBy,
      reviewNotes,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Mark task as completed
    await db.collection('tasks').doc(submission.taskId).update({
      status: 'completed',
      approvedBy: reviewedBy,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Award points to the user
    const taskSnap = await db.collection('tasks').doc(submission.taskId).get();
    if (taskSnap.exists) {
      const task = taskSnap.data();
      const bountyPoints = task?.bountyPoints || 0;
      const category = task?.category || 'general';
      const difficulty = task?.difficulty || 'easy';

      // Ensure user_points doc exists
      let upSnap = await db.collection('user_points')
        .where('userId', '==', submission.userId)
        .limit(1)
        .get();
      if (upSnap.empty) {
        await db.collection('user_points').add({
          userId: submission.userId,
          totalPoints: 0,
          availablePoints: 0,
          spentPoints: 0,
          pointsHistory: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
        upSnap = await db.collection('user_points')
          .where('userId', '==', submission.userId)
          .limit(1)
          .get();
      }

      const upDoc = upSnap.docs[0];
      const upData = upDoc.data();
      const now = new Date();
      const tx = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'earned',
        amount: bountyPoints,
        description: `Completed task: ${submission.taskId}`,
        taskId: submission.taskId,
        timestamp: now,
        metadata: { category, difficulty },
      };

      await db.collection('user_points').doc(upDoc.id).update({
        totalPoints: (upData.totalPoints || 0) + bountyPoints,
        availablePoints: (upData.availablePoints || 0) + bountyPoints,
        lastUpdated: now,
        updatedAt: now,
        pointsHistory: [...(upData.pointsHistory || []), tx],
      });

      // Optional: keep history
      try { await db.collection('user_points_history').add(tx); } catch (_) {}
    }

    console.log('✅ Submission approved, task completed, points awarded');
    console.log('🆔 Submission ID:', submission.id);
  } catch (err) {
    console.error('❌ Failed to approve submission:', err.message);
    process.exit(1);
  }
}

main();


