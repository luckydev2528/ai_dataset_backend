const { TaskModel } = require('./dist/services/database/models/taskModel');
const { initializeFirebaseAdmin } = require('./dist/services/auth/firebaseAdmin');

async function checkTasks() {
  try {
    await initializeFirebaseAdmin();
    const tasks = await TaskModel.getActiveTasks();
    console.log('Active tasks count:', tasks.length);
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ID: ${task.id}, Title: ${task.title}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkTasks();
