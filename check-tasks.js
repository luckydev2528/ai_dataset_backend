require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID
});

const db = getFirestore();

async function checkTasks() {
  try {
    const snapshot = await db.collection('tasks').get();
    console.log('Total tasks in database:', snapshot.size);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('Task:', data.title);
      console.log('  Status:', data.status);
      console.log('  IsActive:', data.isActive);
      console.log('  ExpiryDate:', data.expiryDate);
      console.log('  ExpiryDate type:', typeof data.expiryDate);
      console.log('  Current time:', new Date());
      console.log('  Is expired?', new Date(data.expiryDate) < new Date());
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTasks();


