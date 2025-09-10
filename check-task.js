const { TaskModel } = require('./dist/services/database/models/taskModel');
const { initializeFirebaseAdmin } = require('./dist/services/auth/firebaseAdmin');

async function checkTask() {
  try {
    await initializeFirebaseAdmin();
    const task = await TaskModel.getTaskById('PI250ZY3wcH7ZJAhPG55');
    console.log('Task details:', JSON.stringify(task, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkTask();
