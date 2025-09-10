const { TaskModel } = require('./dist/services/database/models/taskModel');
const { initializeFirebaseAdmin } = require('./dist/services/auth/firebaseAdmin');

async function checkSpecificTask() {
  try {
    await initializeFirebaseAdmin();
    console.log('🔍 Checking task by ID...');
    const task = await TaskModel.getTaskById('PI250ZY3wcH7ZJAhPG55');
    console.log('Task by ID result:', task ? 'Found' : 'Not found');
    
    if (task) {
      console.log('Task details:', JSON.stringify(task, null, 2));
    } else {
      console.log('❌ Task not found by ID, checking all tasks...');
      const allTasks = await TaskModel.getActiveTasks();
      const foundTask = allTasks.find(t => t.id === 'PI250ZY3wcH7ZJAhPG55');
      console.log('Found in active tasks:', foundTask ? 'Yes' : 'No');
      if (foundTask) {
        console.log('Task from active tasks:', JSON.stringify(foundTask, null, 2));
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkSpecificTask();
