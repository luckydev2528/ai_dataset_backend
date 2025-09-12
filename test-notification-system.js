const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin with service account
const serviceAccount = require('./datarefinery-6db5e-firebase-adminsdk-fbsvc-408eea0d7c.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'datarefinery-6db5e',
});

async function testNotificationSystem() {
  try {
    console.log('🚀 Testing Firebase Cloud Messaging System...');
    console.log('📋 Available endpoints:');
    console.log('  - POST /api/notifications/test');
    console.log('  - POST /api/notifications/send-to-all');
    console.log('  - POST /api/notifications/send-to-user');
    console.log('  - POST /api/notifications/new-task');
    console.log('  - POST /api/notifications/task-approved');
    console.log('  - POST /api/notifications/task-rejected');
    console.log('  - GET /api/notifications/stats');
    console.log('');

    // Test 1: Send test notification to a specific token
    console.log('🧪 Test 1: Sending test notification to specific device');
    const testToken = 'YOUR_FCM_TOKEN_HERE'; // Replace with actual token
    
    if (testToken !== 'YOUR_FCM_TOKEN_HERE') {
      const message = {
        notification: {
          title: '🧪 Test Notification',
          body: 'This is a test notification from DRR backend!',
        },
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        },
        token: testToken,
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Test notification sent successfully:', response);
    } else {
      console.log('⚠️ Skipping test notification - no FCM token provided');
    }

    // Test 2: Send notification to topic
    console.log('\n🧪 Test 2: Sending notification to topic');
    const topicMessage = {
      notification: {
        title: '📢 Topic Notification',
        body: 'This is a test notification sent to all users!',
      },
      data: {
        type: 'topic_test',
        timestamp: new Date().toISOString(),
      },
      topic: 'all_users',
    };

    const topicResponse = await admin.messaging().send(topicMessage);
    console.log('✅ Topic notification sent successfully:', topicResponse);

    // Test 3: Send new task notification
    console.log('\n🧪 Test 3: Sending new task notification');
    const newTaskMessage = {
      notification: {
        title: '🎯 New Task Available!',
        body: 'React Native Push Notifications Tutorial - Earn 500 points',
      },
      data: {
        type: 'new_task',
        taskId: 'pFT2j1RFmQUAZkv9JQoq',
        bountyPoints: '500',
      },
      topic: 'all_users',
    };

    const newTaskResponse = await admin.messaging().send(newTaskMessage);
    console.log('✅ New task notification sent successfully:', newTaskResponse);

    // Test 4: Send task approval notification
    console.log('\n🧪 Test 4: Sending task approval notification');
    const approvalMessage = {
      notification: {
        title: '🎉 Task Approved!',
        body: 'You earned 500 points for "React Native Push Notifications Tutorial"',
      },
      data: {
        type: 'task_approved',
        pointsEarned: '500',
        taskId: 'pFT2j1RFmQUAZkv9JQoq',
      },
      topic: 'all_users',
    };

    const approvalResponse = await admin.messaging().send(approvalMessage);
    console.log('✅ Task approval notification sent successfully:', approvalResponse);

    console.log('\n✅ All notification tests completed successfully!');
    console.log('\n📱 Next steps:');
    console.log('1. Run your React Native app');
    console.log('2. Check the logs for FCM token');
    console.log('3. Replace YOUR_FCM_TOKEN_HERE with the actual token');
    console.log('4. Test individual device notifications');
    console.log('5. Use the API endpoints to send notifications from your backend');

  } catch (error) {
    console.error('❌ Error testing notification system:', error);
  }
}

async function showAPIExamples() {
  console.log('\n📚 API Usage Examples:');
  console.log('');
  
  console.log('1. Send test notification to specific device:');
  console.log('curl -X POST http://localhost:3000/api/notifications/test \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\');
  console.log('  -d \'{"token": "YOUR_FCM_TOKEN"}\'');
  console.log('');

  console.log('2. Send notification to all users:');
  console.log('curl -X POST http://localhost:3000/api/notifications/send-to-all \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\');
  console.log('  -d \'{"title": "Hello", "body": "This is a test"}\'');
  console.log('');

  console.log('3. Send new task notification:');
  console.log('curl -X POST http://localhost:3000/api/notifications/new-task \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\');
  console.log('  -d \'{"taskId": "pFT2j1RFmQUAZkv9JQoq", "taskTitle": "Test Task", "bountyPoints": 500}\'');
  console.log('');

  console.log('4. Get notification statistics:');
  console.log('curl -X GET http://localhost:3000/api/notifications/stats \\');
  console.log('  -H "Authorization: Bearer YOUR_JWT_TOKEN"');
  console.log('');
}

// Run the tests
testNotificationSystem()
  .then(() => showAPIExamples())
  .then(() => process.exit(0))
  .catch(console.error);

