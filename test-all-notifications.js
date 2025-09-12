const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin with service account
const serviceAccount = require('./datarefinery-6db5e-firebase-adminsdk-fbsvc-408eea0d7c.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'datarefinery-6db5e',
});

async function testAllNotifications() {
  try {
    console.log('🧪 Testing All Notification Types...');
    console.log('=====================================');
    
    // Test 1: New Task Notification
    console.log('\n1️⃣ Testing New Task Notification...');
    const newTaskMessage = {
      notification: {
        title: '🎯 New Task Available!',
        body: 'React Native Performance Optimization - Earn 350 points',
      },
      data: {
        type: 'new_task',
        taskId: 'QexnpHGtjgCd7OJ1XVup',
        taskTitle: 'React Native Performance Optimization',
        bountyPoints: '350',
        category: 'Technical',
        difficulty: 'medium'
      },
      topic: 'all_users',
    };
    
    const newTaskResponse = await admin.messaging().send(newTaskMessage);
    console.log('✅ New task notification sent:', newTaskResponse);

    // Test 2: Task Approval Notification
    console.log('\n2️⃣ Testing Task Approval Notification...');
    const approvalMessage = {
      notification: {
        title: '🎉 Task Approved!',
        body: 'You earned 250 points for "Push Notification Testing Task"',
      },
      data: {
        type: 'task_approved',
        taskId: 'pyzjxMHA9H6uS6KBNYQz',
        taskTitle: 'Push Notification Testing Task',
        pointsEarned: '250',
        totalPoints: '950'
      },
      topic: 'all_users',
    };
    
    const approvalResponse = await admin.messaging().send(approvalMessage);
    console.log('✅ Task approval notification sent:', approvalResponse);

    // Test 3: Task Rejection Notification
    console.log('\n3️⃣ Testing Task Rejection Notification...');
    const rejectionMessage = {
      notification: {
        title: '❌ Task Rejected',
        body: 'Your submission for "Mobile App UI/UX Design" was rejected',
      },
      data: {
        type: 'task_rejected',
        taskId: 'iMaPuenV5zAsl8WXABpx',
        taskTitle: 'Mobile App UI/UX Design Tutorial',
        reason: 'Video quality does not meet requirements',
        feedback: 'Please ensure video is clear and well-lit'
      },
      topic: 'all_users',
    };
    
    const rejectionResponse = await admin.messaging().send(rejectionMessage);
    console.log('✅ Task rejection notification sent:', rejectionResponse);

    // Test 4: Points Milestone Notification
    console.log('\n4️⃣ Testing Points Milestone Notification...');
    const milestoneMessage = {
      notification: {
        title: '🏆 Points Milestone!',
        body: 'Congratulations! You\'ve reached 1000 points!',
      },
      data: {
        type: 'points_milestone',
        totalPoints: '1000',
        milestone: '1000 points',
        achievement: 'Bronze Contributor'
      },
      topic: 'all_users',
    };
    
    const milestoneResponse = await admin.messaging().send(milestoneMessage);
    console.log('✅ Points milestone notification sent:', milestoneResponse);

    // Test 5: General Announcement
    console.log('\n5️⃣ Testing General Announcement...');
    const announcementMessage = {
      notification: {
        title: '📢 System Update',
        body: 'New features added! Check out the updated task categories.',
      },
      data: {
        type: 'announcement',
        priority: 'normal',
        action: 'open_app',
        deepLink: 'app://home'
      },
      topic: 'all_users',
    };
    
    const announcementResponse = await admin.messaging().send(announcementMessage);
    console.log('✅ General announcement sent:', announcementResponse);

    // Test 6: Test Notification (for debugging)
    console.log('\n6️⃣ Testing Debug Notification...');
    const testMessage = {
      notification: {
        title: '🧪 Test Notification',
        body: 'This is a test notification to verify FCM is working correctly.',
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        debug: 'true'
      },
      topic: 'all_users',
    };
    
    const testResponse = await admin.messaging().send(testMessage);
    console.log('✅ Test notification sent:', testResponse);

    console.log('\n🎉 All notification tests completed successfully!');
    console.log('=====================================');
    console.log('📱 Check your mobile devices for notifications!');
    console.log('📋 Total notifications sent: 6');
    console.log('🔔 All notifications sent to topic: all_users');
    
  } catch (error) {
    console.error('❌ Error testing notifications:', error);
  }
}

// Run all tests
testAllNotifications()
  .then(() => process.exit(0))
  .catch(console.error);

