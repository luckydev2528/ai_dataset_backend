const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

async function verifyFirebase() {
  console.log('🔍 Firebase Configuration Verification Script');
  console.log('=============================================\n');

  // Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found in backend directory');
  console.log('📝 Creating .env file with your credentials...\n');
  
  // Create .env file with proper formatting
  const envContent = `# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=datarefinery-6db5e
FIREBASE_PRIVATE_KEY_ID=408eea0d7cb10d8803a0bf99f942cf362c467207
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDRKoOinR2bFOG/\\naZXRj1ZidsbmaB7CTeJ0tO7ogodxMH6+YXsBkq0zZ8wtC3nvbac7BHk7HHWqixmm\\nuctnRWRqZ3cxy+udJyDT6iOlKwmL0WufudIcXHr7+N8TsIGecPg5fTUggBU1o/XB\\nA+ysAviApwvpxQ0WR0e2iHHTm9IC7MaxTZrmGO9MjPU4H/lwIsRxtg3cLja+f4Tc\\nBf5AYotWPmPeCDOcYh0N0PJ0GcQh9LpyLvdhiRhtcsWNuZuojcBdFBzueCedseBg\\n998OhMnnQv+qQ4DGxLOcH9uc9WASMoVI0ot39NKi5nfu6QBi9y/BZF5AcmE4OUba\\nKWJoaxndAgMBAAECggEAK7nkB+gpisSMRuwnPkZlTDNBdGRa3crTZwt2EFRNRTva\\nmykcwmDr5V2zIM2P4Z4+Qge24kUaUhs/MwwPOhkXG2li0R2stU87PSHq7rn3Bmwy\\nwBLkGjq5GRjXZbHV/w3lznre0tsD1BFhLEcKQJFkatzBEE8546jmFIIkrZSbDDIb\\njtW15XVXW3wKQZ3Sn1EsFWzHrt3un0NhXw1rdUSby84parxtJICS8iv9l7YrVa/w\\n9iVqw6W6LTikHxr42To0bZsukOUkt6J4SdTjTx/BYFSdhcmN/KyRy1SD2jq+kjUi\\n71Sa8SUFS/SfDQnu+l9yC/pbjE1AI3gFYkk9j7r1AQKBgQD2B0GOOCZYUgyOCRr3\\nVU4qgfaLEdMYUEvxg0WNkmpewR1zgdhanocFdXLi/tsbqWkTuibgLiitl7VBbEg2\\n1M6UCzYx88idY+UjilDW+dSsJbFBcOUm1RoCAfHF/DUhFZr/H2Zo1lSBUqPQTXMy\\nOKNCL17wADbCxt//2AJ4Uwg9gQKBgQDZpMg3jzcHVl7ZTVg1xtylsnsl7ix9UiUt\\nCSfV/RKyay49IZU6UO1i3WuyITYeM4Qsnf7mKNaT+zLdGywXI37KHNN/XkjaGdNQ\\n/WJU9j0ipAmAN99NyOwOWXBBbnBGqtRvm+0UFuMxpsaJXdtEWrvi0X9aTRxlip4p\\n/lZ9ilHCXQKBgA5qXmz23UhPhmzMG8hiNzJGayu636ONEOYVyv2Alrr2lcMu2H52\\ny3KGbzTdufjk9EMzpRN9oOSK/xPWRGTyEyiZf5NttVODhumOMS5ndQ6hJsGu275q\\nvhtgAcqX/ITzvyEztcxuwoTRUsfhwd4vc2FtZSKq4IqJHJbhEUP7mYABAoGBAIoV\\njiIR7yvslIjyFYEpBlzqfE94aSmpsIR+RpPx2KbycYe/gtpY9gO/z9BYWemXbciR\\nBWQpjNqeiYrW7oZPsuWwnE83FqmpsPS1jmmxQOB1isGasUa8r2f7PsmEtB9hyx50\\no1oXm1WpJlWJAtC/cG1b1Z0JR3b1F5w1DdLgqzbRAoGADazPWKhOI8hcC1OYpGKM\\nJ0ePlmofl2wTNPvzDTsXruKPhh76Waq9mU8SvA0pj/82W00NT9E8sXGSTBkFIZcM\\nYghr457JEnSm36SsHzKl7Lw02q4rx6QSNETZ845MlY1Il7G+mkY0zszH4SN9pF8N\\nqHNsCF6vt22B5Kz6qzNDu3g=\\n-----END PRIVATE KEY-----\\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@datarefinery-6db5e.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=110626571892433395994
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40datarefinery-6db5e.iam.gserviceaccount.com

# JWT Configuration
JWT_SECRET=REQUIRED_MINIMUM_32_CHARACTERS_STRONG_RANDOM_STRING
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=REQUIRED_MINIMUM_64_CHARACTERS_STRONG_RANDOM_STRING_DIFFERENT_FROM_JWT_SECRET
REFRESH_TOKEN_EXPIRES_IN=30d

# Server Configuration
NODE_ENV=development
PORT=3000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Twitter OAuth (Server-side only)
TWITTER_CONSUMER_KEY=your_twitter_consumer_key
TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret

# API Base URL
API_BASE_URL=http://localhost:3000
`;

  fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully');
  } else {
    console.log('✅ .env file exists');
  }

  // Load environment variables
  dotenv.config();

  console.log('\n🔍 Checking Firebase Environment Variables:');
  console.log('==========================================');

  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL'
  ];

  let allVarsPresent = true;

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: Set (${value.length} characters)`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      allVarsPresent = false;
    }
  });

  if (!allVarsPresent) {
    console.log('\n❌ Some required Firebase environment variables are missing');
    process.exit(1);
  }

  console.log('\n🔧 Initializing Firebase Admin SDK...');
  console.log('=====================================');

  try {
  // Check if Firebase is already initialized
  if (admin.apps.length > 0) {
    console.log('⚠️ Firebase Admin already initialized, using existing instance');
  } else {
    // Initialize Firebase Admin
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
  }

  // Test Firebase Auth
  console.log('\n🔐 Testing Firebase Auth...');
  console.log('===========================');
  
  const auth = admin.auth();
  console.log('✅ Firebase Auth service accessible');

  // Test Firestore
  console.log('\n🗄️ Testing Firestore...');
  console.log('========================');
  
  const db = admin.firestore();
  console.log('✅ Firestore service accessible');

  // Test database operations
  console.log('\n📝 Testing Database Operations...');
  console.log('=================================');

  // Test creating a test document
  const testCollection = db.collection('test');
  const testDoc = testCollection.doc('verification-test');
  
  await testDoc.set({
    message: 'Firebase verification test',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    verified: true
  });
  
  console.log('✅ Test document created successfully');

  // Test reading the document
  const doc = await testDoc.get();
  if (doc.exists) {
    console.log('✅ Test document read successfully');
    console.log('📄 Document data:', doc.data());
  } else {
    console.log('❌ Test document not found');
  }

  // Clean up test document
  await testDoc.delete();
  console.log('✅ Test document cleaned up');

  // Test user operations
  console.log('\n👤 Testing User Operations...');
  console.log('=============================');

  // Create a test user
  const testUid = 'test-user-' + Date.now();
  const testUser = await auth.createUser({
    uid: testUid,
    email: `test-${Date.now()}@example.com`,
    displayName: 'Test User',
    disabled: false
  });

  console.log('✅ Test user created successfully');
  console.log('👤 User UID:', testUser.uid);

  // Test custom token creation
  const customToken = await auth.createCustomToken(testUid, {
    provider: 'test',
    test: true
  });

  console.log('✅ Custom token created successfully');
  console.log('🔑 Token length:', customToken.length);

  // Clean up test user
  await auth.deleteUser(testUid);
  console.log('✅ Test user cleaned up');

  console.log('\n🎉 All Firebase tests passed successfully!');
  console.log('==========================================');
  console.log('✅ Firebase Admin SDK: Working');
  console.log('✅ Firebase Auth: Working');
  console.log('✅ Firestore: Working');
  console.log('✅ Database Operations: Working');
  console.log('✅ User Operations: Working');
  console.log('✅ Custom Token Creation: Working');

  console.log('\n📋 Next Steps:');
  console.log('==============');
  console.log('1. Restart your backend server');
  console.log('2. The Firestore error should be resolved');
  console.log('3. User data will now be stored in the database');

} catch (error) {
  console.error('\n❌ Firebase verification failed:');
  console.error('================================');
  console.error('Error:', error.message);
  
  if (error.code) {
    console.error('Error Code:', error.code);
  }
  
  console.error('\n🔧 Troubleshooting:');
  console.error('===================');
  console.error('1. Check if your Firebase project is active');
  console.error('2. Verify the service account has proper permissions');
  console.error('3. Ensure Firestore is enabled in your Firebase project');
  console.error('4. Check your internet connection');
  
    process.exit(1);
  }
}

// Run the verification
verifyFirebase().catch(console.error);
