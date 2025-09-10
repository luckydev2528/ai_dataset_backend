#!/usr/bin/env node

/**
 * Populate Database with Sample Data
 * This script adds sample tasks and challenges to the database for testing
 */

require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

try {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  process.exit(1);
}

const db = getFirestore();

// Helper function to generate search terms
function generateSearchTerms(text) {
  if (!text) return [];
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove special characters
    .split(/\s+/) // Split on whitespace
    .filter(term => term.length >= 2) // Filter short terms
    .filter((term, index, array) => array.indexOf(term) === index) // Remove duplicates
    .slice(0, 50); // Limit to 50 terms for performance
}

// Sample Challenges Data
const sampleChallenges = [
  {
    title: "Creative Video Challenge",
    description: "Create a 30-second video showcasing your creativity and storytelling skills. Use any props or materials you have available.",
    category: "Creative",
    difficulty: "easy",
    points: 50,
    isActive: true,
    estimatedTime: 15,
    requirements: [
      "Video must be exactly 30 seconds",
      "Must include a clear beginning, middle, and end",
      "No copyrighted music or content"
    ],
    instructions: [
      "Plan your story before recording",
      "Use good lighting and clear audio",
      "Be creative and original"
    ],
    tags: ["video", "creative", "storytelling", "30-seconds"]
  },
  {
    title: "Tech Tutorial Challenge",
    description: "Create a 2-minute tutorial explaining a technical concept in simple terms that anyone can understand.",
    category: "Educational",
    difficulty: "medium",
    points: 100,
    isActive: true,
    estimatedTime: 30,
    requirements: [
      "Must explain a real technical concept",
      "Use simple language and analogies",
      "Include visual aids or demonstrations"
    ],
    instructions: [
      "Choose a topic you're knowledgeable about",
      "Break it down into simple steps",
      "Use examples and analogies"
    ],
    tags: ["tutorial", "education", "technology", "explanation"]
  },
  {
    title: "Fitness Motivation Challenge",
    description: "Record a 1-minute workout routine that others can follow along with. Include proper form demonstrations.",
    category: "Fitness",
    difficulty: "easy",
    points: 75,
    isActive: true,
    estimatedTime: 20,
    requirements: [
      "Must be a complete workout routine",
      "Include proper form demonstrations",
      "Suitable for beginners"
    ],
    instructions: [
      "Warm up before starting",
      "Demonstrate each exercise clearly",
      "Provide modifications for different fitness levels"
    ],
    tags: ["fitness", "workout", "motivation", "health"]
  },
  {
    title: "Cooking Masterclass Challenge",
    description: "Teach viewers how to cook a specific dish from start to finish. Include ingredient preparation and cooking techniques.",
    category: "Cooking",
    difficulty: "medium",
    points: 120,
    isActive: true,
    estimatedTime: 45,
    requirements: [
      "Must be a complete recipe",
      "Show all preparation steps",
      "Include cooking tips and techniques"
    ],
    instructions: [
      "Prepare all ingredients beforehand",
      "Explain each step clearly",
      "Share cooking tips and tricks"
    ],
    tags: ["cooking", "recipe", "food", "tutorial"]
  },
  {
    title: "Art & Craft Challenge",
    description: "Create a piece of art or craft project and document the process. Show your creative process from idea to completion.",
    category: "Art",
    difficulty: "easy",
    points: 80,
    isActive: true,
    estimatedTime: 25,
    requirements: [
      "Must be an original creation",
      "Document the entire process",
      "Explain your creative choices"
    ],
    instructions: [
      "Plan your project before starting",
      "Document each step of the process",
      "Explain your creative decisions"
    ],
    tags: ["art", "craft", "creative", "process"]
  }
];

// Sample Tasks Data
const sampleTasks = [
  {
    title: "Create a Product Demo Video",
    description: "Record a 2-minute product demonstration video showcasing the key features and benefits of our mobile app. Focus on user experience and functionality.",
    bountyPoints: 200,
    category: "Marketing",
    difficulty: "medium",
    createdBy: "admin",
    challengeIds: [], // Will be populated after challenges are created
    isActive: true,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    metadata: {
      tags: ["product", "demo", "video", "marketing"],
      requirements: [
        "Video must be 2 minutes long",
        "Show all key app features",
        "Professional quality recording",
        "Include call-to-action at the end"
      ],
      instructions: [
        "Download and test the app first",
        "Plan your demo flow",
        "Use good lighting and clear audio",
        "Focus on user benefits"
      ],
      estimatedTime: 60,
      maxParticipants: 10,
      currentParticipants: 0
    }
  },
  {
    title: "Social Media Content Creation",
    description: "Create engaging social media content (posts, stories, reels) for our brand. Include captions, hashtags, and visual content.",
    bountyPoints: 150,
    category: "Social Media",
    difficulty: "easy",
    createdBy: "admin",
    challengeIds: [],
    isActive: true,
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    metadata: {
      tags: ["social", "content", "marketing", "engagement"],
      requirements: [
        "Create content for 3 different platforms",
        "Include relevant hashtags",
        "Original visual content",
        "Engaging captions"
      ],
      instructions: [
        "Research our brand voice and style",
        "Create platform-specific content",
        "Use trending hashtags appropriately",
        "Include clear calls-to-action"
      ],
      estimatedTime: 45,
      maxParticipants: 15,
      currentParticipants: 0
    }
  },
  {
    title: "User Testimonial Collection",
    description: "Interview 5 users about their experience with our product and create compelling testimonial videos. Include both positive feedback and constructive suggestions.",
    bountyPoints: 300,
    category: "Research",
    difficulty: "hard",
    createdBy: "admin",
    challengeIds: [],
    isActive: true,
    expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    metadata: {
      tags: ["testimonials", "research", "user-feedback", "interviews"],
      requirements: [
        "Interview at least 5 different users",
        "Include both positive and constructive feedback",
        "Professional video quality",
        "Diverse user demographics"
      ],
      instructions: [
        "Prepare interview questions beforehand",
        "Ensure good audio and video quality",
        "Get permission to use testimonials",
        "Edit for clarity and impact"
      ],
      estimatedTime: 120,
      maxParticipants: 5,
      currentParticipants: 0
    }
  },
  {
    title: "Technical Documentation Video",
    description: "Create a comprehensive technical documentation video explaining our API endpoints and integration process for developers.",
    bountyPoints: 250,
    category: "Technical",
    difficulty: "hard",
    createdBy: "admin",
    challengeIds: [],
    isActive: true,
    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    metadata: {
      tags: ["documentation", "technical", "api", "developers"],
      requirements: [
        "Cover all major API endpoints",
        "Include code examples",
        "Explain authentication process",
        "Show error handling"
      ],
      instructions: [
        "Review existing API documentation",
        "Test all endpoints yourself",
        "Create clear code examples",
        "Include troubleshooting tips"
      ],
      estimatedTime: 90,
      maxParticipants: 8,
      currentParticipants: 0
    }
  },
  {
    title: "Community Engagement Challenge",
    description: "Organize and host a virtual community event or workshop. Document the process and create content for future events.",
    bountyPoints: 400,
    category: "Community",
    difficulty: "hard",
    createdBy: "admin",
    challengeIds: [],
    isActive: true,
    expiryDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
    metadata: {
      tags: ["community", "events", "workshop", "engagement"],
      requirements: [
        "Host a virtual event with at least 10 participants",
        "Create engaging content and activities",
        "Document the entire process",
        "Gather feedback from participants"
      ],
      instructions: [
        "Choose a relevant topic for our community",
        "Plan interactive activities",
        "Promote the event effectively",
        "Record key moments for documentation"
      ],
      estimatedTime: 180,
      maxParticipants: 3,
      currentParticipants: 0
    }
  }
];

async function populateDatabase() {
  try {
    console.log('🚀 Starting database population...\n');

    // Add Challenges
    console.log('📝 Adding challenges...');
    const challengeIds = [];
    
    for (const challengeData of sampleChallenges) {
      const searchTerms = generateSearchTerms(`${challengeData.title} ${challengeData.description}`);
      
      const challenge = {
        ...challengeData,
        searchTerms,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await db.collection('challenges').add(challenge);
      challengeIds.push(docRef.id);
      console.log(`✅ Added challenge: ${challengeData.title} (ID: ${docRef.id})`);
    }

    console.log(`\n📋 Added ${challengeIds.length} challenges\n`);

    // Add Tasks
    console.log('📝 Adding tasks...');
    
    for (const taskData of sampleTasks) {
      const searchTerms = generateSearchTerms(`${taskData.title} ${taskData.description}`);
      
      // Assign random challenges to tasks
      const assignedChallenges = challengeIds
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 1); // 1-3 random challenges

      const task = {
        ...taskData,
        challengeIds: assignedChallenges,
        searchTerms,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await db.collection('tasks').add(task);
      console.log(`✅ Added task: ${taskData.title} (ID: ${docRef.id})`);
      console.log(`   - Assigned ${assignedChallenges.length} challenges`);
      console.log(`   - Expires: ${taskData.expiryDate.toLocaleDateString()}`);
    }

    console.log(`\n📋 Added ${sampleTasks.length} tasks\n`);

    // Create some sample user points
    console.log('💰 Creating sample user points...');
    const sampleUsers = [
      '1ark93rn5Rdd615kZLsNjvwwW0y2', // From the logs
      'twitter_1631602993542975490'    // From the logs
    ];

    for (const userId of sampleUsers) {
      const userPoints = {
        userId,
        totalPoints: Math.floor(Math.random() * 1000) + 100,
        availablePoints: Math.floor(Math.random() * 500) + 50,
        spentPoints: Math.floor(Math.random() * 300),
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        pointsHistory: []
      };

      await db.collection('user_points').doc(userId).set(userPoints);
      console.log(`✅ Created points for user: ${userId} (${userPoints.availablePoints} available)`);
    }

    console.log('\n🎉 Database population completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${challengeIds.length} challenges added`);
    console.log(`   - ${sampleTasks.length} tasks added`);
    console.log(`   - ${sampleUsers.length} user points records created`);
    console.log('\n🔗 You can now test the API endpoints:');
    console.log('   - GET /api/task/active');
    console.log('   - GET /api/challenge/active');
    console.log('   - GET /api/user-points/my');

  } catch (error) {
    console.error('❌ Error populating database:', error);
    process.exit(1);
  }
}

// Run the script
populateDatabase()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


