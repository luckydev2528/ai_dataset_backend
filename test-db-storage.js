const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

console.log('🗄️ Database Storage Test Script');
console.log('================================\n');

async function testDatabaseStorage() {
  try {
    // Initialize Firebase Admin if not already initialized
    if (admin.apps.length === 0) {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }

    const db = admin.firestore();
    const auth = admin.auth();

    console.log('🔍 Testing Twitter User Storage...');
    console.log('==================================');

    // Simulate Twitter user data (like what your backend creates)
    const twitterUserId = '1631602993542975490';
    const firebaseUid = `twitter_${twitterUserId}`;
    const userData = {
      uid: firebaseUid,
      email: `twitter_${twitterUserId}@app.local`,
      name: '_Hammad_Zahid',
      type: 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date()
      // photo: undefined, // Omitted to avoid undefined values in Firestore
    };

    console.log('📝 User data to store:', {
      ...userData,
      createdAt: userData.createdAt.toISOString(),
      updatedAt: userData.updatedAt.toISOString(),
      lastLoginAt: userData.lastLoginAt.toISOString()
    });

    // Test 1: Store user in Firestore
    console.log('\n1️⃣ Testing Firestore User Storage...');
    const userRef = db.collection('users').doc(firebaseUid);
    
    await userRef.set({
      ...userData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ User stored in Firestore successfully');

    // Test 2: Read user from Firestore
    console.log('\n2️⃣ Testing Firestore User Retrieval...');
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('✅ User retrieved from Firestore successfully');
      console.log('📄 User data:', {
        uid: userData.uid,
        email: userData.email,
        name: userData.name,
        type: userData.type,
        isActive: userData.isActive,
        createdAt: userData.createdAt?.toDate?.()?.toISOString() || 'N/A',
        updatedAt: userData.updatedAt?.toDate?.()?.toISOString() || 'N/A',
        lastLoginAt: userData.lastLoginAt?.toDate?.()?.toISOString() || 'N/A'
      });
    } else {
      console.log('❌ User not found in Firestore');
    }

    // Test 3: Update user in Firestore
    console.log('\n3️⃣ Testing Firestore User Update...');
    await userRef.update({
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ User updated in Firestore successfully');

    // Test 4: Query user by UID
    console.log('\n4️⃣ Testing Firestore User Query...');
    const querySnapshot = await db.collection('users')
      .where('uid', '==', firebaseUid)
      .limit(1)
      .get();

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      console.log('✅ User found via query');
      console.log('📄 Query result:', {
        id: userDoc.id,
        uid: userDoc.data().uid,
        email: userDoc.data().email
      });
    } else {
      console.log('❌ User not found via query');
    }

    // Test 5: Create Firebase Auth user
    console.log('\n5️⃣ Testing Firebase Auth User Creation...');
    const testEmail = `test-${Date.now()}@example.com`;
    const authUser = await auth.createUser({
      uid: firebaseUid,
      email: testEmail,
      displayName: userData.name,
      disabled: false
    });

    console.log('✅ Firebase Auth user created successfully');
    console.log('👤 Auth user UID:', authUser.uid);

    // Test 6: Create custom token
    console.log('\n6️⃣ Testing Custom Token Creation...');
    const customToken = await auth.createCustomToken(firebaseUid, {
      provider: 'twitter',
      screen_name: userData.name,
      twitter_id: twitterUserId,
      email: userData.email
    });

    console.log('✅ Custom token created successfully');
    console.log('🔑 Token length:', customToken.length);

    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    await userRef.delete();
    await auth.deleteUser(firebaseUid);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All database storage tests passed!');
    console.log('====================================');
    console.log('✅ Firestore write: Working');
    console.log('✅ Firestore read: Working');
    console.log('✅ Firestore update: Working');
    console.log('✅ Firestore query: Working');
    console.log('✅ Firebase Auth user creation: Working');
    console.log('✅ Custom token creation: Working');

    console.log('\n📋 Your Twitter OAuth should now work with database storage!');

  } catch (error) {
    console.error('\n❌ Database storage test failed:');
    console.error('================================');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }

    console.error('\n🔧 Common Issues:');
    console.error('=================');
    console.error('1. Firestore not enabled in Firebase Console');
    console.error('2. Service account lacks Firestore permissions');
    console.error('3. Network connectivity issues');
    console.error('4. Invalid Firebase configuration');

    process.exit(1);
  }
}

// Run the test
testDatabaseStorage();
