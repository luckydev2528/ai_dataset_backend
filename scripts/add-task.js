/*
 * Script: add-task.js
 * Purpose: Insert a task JSON into Firestore `tasks` collection, mapping fields to backend model shape
 * Usage:
 *   node scripts/add-task.js --file ../test-task-ci.json
 *   node scripts/add-task.js --json '{"title":"...","...":...}'
 *
 * Env requirements (same as other admin scripts):
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
// Load env from root first, then backend folder (second call doesn't override already-set vars)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file' || a === '-f') args.file = argv[++i];
    else if (a === '--json' || a === '-j') args.json = argv[++i];
    else if (a === '--id') args.id = argv[++i];
  }
  return args;
}

function toDate(value) {
  if (!value) return undefined;
  // Accept ISO string or human-readable; Date constructor can handle many formats
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

function normalizeTaskPayload(raw) {
  // Map incoming JSON (may have fields at root) to model shape expected by backend
  const {
    title,
    description,
    bountyPoints,
    category,
    difficulty,
    status,
    isActive,
    createdById,
    createdAt,
    completedById,
    completedAt,
    expiryDate,
    challengeId,
    challengeIds,
    metadata = {},
    requirements,
    instructions,
    tags,
    maxParticipants,
    searchTerms,
  } = raw;

  const mergedMetadata = {
    ...(metadata || {}),
    // Promote root arrays into metadata if provided
    requirements: requirements ?? metadata.requirements,
    instructions: instructions ?? metadata.instructions,
    tags: tags ?? metadata.tags,
    estimatedTime: metadata.estimatedTime,
    maxParticipants: maxParticipants ?? metadata.maxParticipants,
    currentParticipants: metadata.currentParticipants ?? 0,
    searchTerms: searchTerms ?? metadata.searchTerms,
  };

  const challenges = Array.isArray(challengeIds)
    ? challengeIds
    : challengeId
    ? [challengeId]
    : [];

  const doc = {
    title,
    description,
    bountyPoints,
    category,
    difficulty, // 'easy' | 'medium' | 'hard'
    status: status || 'active', // 'active' | 'pending' | 'completed' | 'expired'
    isActive: typeof isActive === 'boolean' ? isActive : true,
    createdBy: createdById || 'admin',
    challengeIds: challenges,
    expiryDate: toDate(expiryDate) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    metadata: mergedMetadata,
    // Optional fields
    ...(completedById ? { completedBy: completedById } : {}),
    ...(toDate(completedAt) ? { completedAt: toDate(completedAt) } : {}),
    // Timestamps set server-side below as well
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  return doc;
}

async function main() {
  try {
    const args = parseArgs(process.argv);

    if (admin.apps.length === 0) {
      const hasDirectCreds =
        !!process.env.FIREBASE_PROJECT_ID &&
        !!process.env.FIREBASE_CLIENT_EMAIL &&
        !!process.env.FIREBASE_PRIVATE_KEY;

      if (hasDirectCreds) {
        const serviceAccount = {
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      } else {
        // Fallback to Application Default Credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS)
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      }
    }

    let rawJson = null;
    if (args.file) {
      const filePath = path.resolve(__dirname, args.file);
      const txt = fs.readFileSync(filePath, 'utf8');
      rawJson = JSON.parse(txt);
    } else if (args.json) {
      rawJson = JSON.parse(args.json);
    } else {
      // Default to a conventional file inside backend when none provided
      const defaultPath = path.resolve(__dirname, '../test-task-ci.json');
      if (!fs.existsSync(defaultPath)) {
        throw new Error('Provide --file <path> or --json <inline-json> (default ../test-task-ci.json not found)');
      }
      const txt = fs.readFileSync(defaultPath, 'utf8');
      rawJson = JSON.parse(txt);
    }

    const taskDoc = normalizeTaskPayload(rawJson);

    const db = admin.firestore();
    const tasks = db.collection('tasks');

    const docRef = args.id ? tasks.doc(args.id) : tasks.doc();
    await docRef.set(taskDoc, { merge: false });

    console.log('✅ Task inserted successfully');
    console.log('🆔 Document ID:', docRef.id);
    console.log('📝 Stored fields:', {
      title: taskDoc.title,
      difficulty: taskDoc.difficulty,
      status: taskDoc.status,
      isActive: taskDoc.isActive,
      bountyPoints: taskDoc.bountyPoints,
      category: taskDoc.category,
      challengeIds: taskDoc.challengeIds,
      hasMetadata: !!taskDoc.metadata,
    });

    // Read back to confirm
    const snap = await docRef.get();
    if (!snap.exists) throw new Error('Verification read failed; doc not found');
    console.log('🔎 Verification read OK. Title:', snap.data().title);
  } catch (err) {
    console.error('❌ Failed to insert task:', err.message);
    process.exit(1);
  }
}

main();


