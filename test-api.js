const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('🧪 Testing backend API...');
    
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthData = await healthResponse.json();
    console.log('Health:', healthData);

    // Test tasks endpoint
    console.log('\n2. Testing tasks endpoint...');
    const tasksResponse = await fetch('http://localhost:3001/api/task');
    const tasksData = await tasksResponse.json();
    console.log('All tasks:', tasksData);

    // Test active tasks endpoint
    console.log('\n3. Testing active tasks endpoint...');
    const activeTasksResponse = await fetch('http://localhost:3001/api/task/active');
    const activeTasksData = await activeTasksResponse.json();
    console.log('Active tasks:', activeTasksData);

  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testAPI();
