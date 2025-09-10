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

async function createIndex() {
  try {
    console.log('🔧 Creating Firestore composite index for tasks...');
    
    // Create the composite index for tasks collection
    const index = {
      collectionGroup: 'tasks',
      fields: [
        { fieldPath: 'isActive', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'expiryDate', order: 'ASCENDING' }
      ]
    };

    // Note: Index creation via Admin SDK is limited
    // The index needs to be created via Firebase Console or gcloud CLI
    console.log('📋 Index configuration:');
    console.log(JSON.stringify(index, null, 2));
    
    console.log('\n🔗 Please create this index manually:');
    console.log('1. Go to: https://console.firebase.google.com/v1/r/project/datarefinery-6db5e/firestore/indexes');
    console.log('2. Click "Create Index"');
    console.log('3. Set Collection ID: tasks');
    console.log('4. Add fields:');
    console.log('   - isActive (Ascending)');
    console.log('   - status (Ascending)');
    console.log('   - expiryDate (Ascending)');
    console.log('5. Click "Create"');
    
    console.log('\n✅ Index creation instructions provided');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createIndex();


