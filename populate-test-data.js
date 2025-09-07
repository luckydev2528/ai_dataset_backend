const admin = require('firebase-admin');
const serviceAccount = require('./datarefinery-6db5e-firebase-adminsdk-fbsvc-408eea0d7c.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Sample tasks data
const sampleTasks = [
  {
    title: 'Make a Sandwich',
    description: 'Create a delicious sandwich with your favorite ingredients',
    bountyPoints: 50,
    expiryDate: new Date('2025-02-15T23:59:59Z'),
    category: 'Cooking',
    difficulty: 'easy',
    status: 'active',
    createdBy: 'admin',
    isActive: true,
    metadata: {
      tags: ['cooking', 'food'],
      requirements: ['ingredients', 'kitchen'],
      instructions: ['Choose your bread', 'Add fillings', 'Cut and serve'],
      estimatedTime: 15,
      maxParticipants: 100,
      currentParticipants: 0,
    },
  },
  {
    title: 'Take a Photo of Nature',
    description: 'Capture a beautiful photo of nature in your local area',
    bountyPoints: 75,
    expiryDate: new Date('2025-02-20T23:59:59Z'),
    category: 'Photography',
    difficulty: 'easy',
    status: 'active',
    createdBy: 'admin',
    isActive: true,
    metadata: {
      tags: ['photography', 'nature'],
      requirements: ['camera or phone'],
      instructions: ['Find a natural setting', 'Take a clear photo', 'Upload the image'],
      estimatedTime: 30,
      maxParticipants: 50,
      currentParticipants: 0,
    },
  },
  {
    title: 'Write a Short Story',
    description: 'Write a creative short story (500-1000 words)',
    bountyPoints: 150,
    expiryDate: new Date('2025-02-25T23:59:59Z'),
    category: 'Writing',
    difficulty: 'medium',
    status: 'active',
    createdBy: 'admin',
    isActive: true,
    metadata: {
      tags: ['writing', 'creative'],
      requirements: ['writing tool', 'imagination'],
      instructions: ['Choose a topic', 'Write 500-1000 words', 'Submit the story'],
      estimatedTime: 60,
      maxParticipants: 25,
      currentParticipants: 0,
    },
  },
  {
    title: 'Learn a New Language',
    description: 'Complete a 30-minute lesson in a new language',
    bountyPoints: 100,
    expiryDate: new Date('2025-02-18T23:59:59Z'),
    category: 'Education',
    difficulty: 'medium',
    status: 'active',
    createdBy: 'admin',
    isActive: true,
    metadata: {
      tags: ['education', 'language'],
      requirements: ['internet access', 'language learning app'],
      instructions: ['Choose a language', 'Complete 30-minute lesson', 'Take a screenshot'],
      estimatedTime: 30,
      maxParticipants: 75,
      currentParticipants: 0,
    },
  },
  {
    title: 'Build a Small Project',
    description: 'Create a small coding project or craft project',
    bountyPoints: 200,
    expiryDate: new Date('2025-03-01T23:59:59Z'),
    category: 'Development',
    difficulty: 'hard',
    status: 'active',
    createdBy: 'admin',
    isActive: true,
    metadata: {
      tags: ['coding', 'crafting', 'project'],
      requirements: ['materials or computer'],
      instructions: ['Plan your project', 'Build it', 'Document the process'],
      estimatedTime: 120,
      maxParticipants: 20,
      currentParticipants: 0,
    },
  },
];

// Sample user points data
const sampleUserPoints = {
  userId: 'test-user-123',
  totalPoints: 1250,
  availablePoints: 850,
  spentPoints: 400,
  pointsHistory: [
    {
      id: '1',
      type: 'earned',
      amount: 50,
      description: 'Completed task: Make a Sandwich',
      taskId: 'task-1',
      timestamp: new Date('2024-01-15T10:00:00Z'),
      metadata: {
        category: 'Cooking',
        difficulty: 'easy',
      },
    },
    {
      id: '2',
      type: 'earned',
      amount: 75,
      description: 'Completed task: Take a Photo of Nature',
      taskId: 'task-2',
      timestamp: new Date('2024-01-16T10:00:00Z'),
      metadata: {
        category: 'Photography',
        difficulty: 'easy',
      },
    },
    {
      id: '3',
      type: 'spent',
      amount: -200,
      description: 'Purchased premium features',
      timestamp: new Date('2024-01-17T10:00:00Z'),
      metadata: {
        category: 'purchase',
        reason: 'premium_upgrade',
      },
    },
  ],
};

async function populateData() {
  try {
    console.log('🚀 Starting to populate test data...');

    // Add tasks
    console.log('📝 Adding tasks...');
    for (const task of sampleTasks) {
      const docRef = await db.collection('tasks').add({
        ...task,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✅ Added task: ${task.title} (ID: ${docRef.id})`);
    }

    // Add user points
    console.log('💰 Adding user points...');
    await db.collection('user_points').add({
      ...sampleUserPoints,
      lastUpdated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Added user points');

    // Add points history
    console.log('📊 Adding points history...');
    for (const transaction of sampleUserPoints.pointsHistory) {
      await db.collection('points_history').add({
        ...transaction,
        userId: sampleUserPoints.userId,
      });
    }
    console.log('✅ Added points history');

    console.log('🎉 Test data populated successfully!');
  } catch (error) {
    console.error('❌ Error populating test data:', error);
  } finally {
    process.exit(0);
  }
}

populateData();
