#!/usr/bin/env node

/**
 * Firebase Configuration Test Script
 * 
 * This script tests the Firebase configuration and initialization
 * to identify any issues with the setup.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔍 Firebase Configuration Test Script');
console.log('=====================================\n');

// Test results tracking
const testResults = {
  environmentVariables: false,
  serviceAccountFile: false,
  firebaseAdminInit: false,
  firestoreConnection: false,
  firestoreService: false
};

// Helper function to print test results
function printTestResult(testName, passed, details = '') {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${testName}: ${passed ? 'PASSED' : 'FAILED'}`);
  if (details) {
    console.log(`   ${details}`);
  }
  console.log('');
}

// Test 1: Environment Variables
console.log('1. Testing Environment Variables...');
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY', 
  'FIREBASE_CLIENT_EMAIL'
];

const missingVars = [];
const presentVars = [];

requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    presentVars.push(varName);
  } else {
    missingVars.push(varName);
  }
});

if (missingVars.length === 0) {
  testResults.environmentVariables = true;
  printTestResult('Environment Variables', true, `All required variables present: ${presentVars.join(', ')}`);
} else {
  printTestResult('Environment Variables', false, `Missing variables: ${missingVars.join(', ')}`);
}

// Test 2: Service Account File
console.log('2. Testing Service Account File...');
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './datarefinery-6db5e-firebase-adminsdk-fbsvc-408eea0d7c.json';

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    const requiredFields = ['project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    
    if (missingFields.length === 0) {
      testResults.serviceAccountFile = true;
      printTestResult('Service Account File', true, `File exists and contains all required fields. Project: ${serviceAccount.project_id}`);
    } else {
      printTestResult('Service Account File', false, `Missing fields: ${missingFields.join(', ')}`);
    }
  } catch (error) {
    printTestResult('Service Account File', false, `Invalid JSON: ${error.message}`);
  }
} else {
  printTestResult('Service Account File', false, `File not found at: ${serviceAccountPath}`);
}

// Test 3: Firebase Admin Initialization
console.log('3. Testing Firebase Admin Initialization...');
try {
  // Import our Firebase Admin initialization function
  const { initializeFirebaseAdmin } = require('./dist/services/auth/firebaseAdmin');
  
  // Initialize Firebase Admin using our function
  const firebaseApp = initializeFirebaseAdmin();
  
  if (firebaseApp) {
    testResults.firebaseAdminInit = true;
    printTestResult('Firebase Admin Initialization', true, `Initialized with project: ${firebaseApp.options.projectId}`);
  } else {
    printTestResult('Firebase Admin Initialization', false, 'Failed to initialize Firebase Admin');
  }
  
} catch (error) {
  printTestResult('Firebase Admin Initialization', false, `Import error: ${error.message}`);
}

// Test 4: Firestore Connection
console.log('4. Testing Firestore Connection...');
if (testResults.firebaseAdminInit) {
  try {
    const admin = require('firebase-admin');
    const db = admin.firestore();
    
    // Test connection with a simple read operation
    const testCollection = db.collection('_test_connection');
    const testDoc = testCollection.doc('_test_doc');
    
    // Try to read a document (this will fail if not connected, but won't throw if connected)
    testDoc.get().then(() => {
      testResults.firestoreConnection = true;
      printTestResult('Firestore Connection', true, 'Successfully connected to Firestore');
      runFinalTests();
    }).catch((error) => {
      printTestResult('Firestore Connection', false, `Connection error: ${error.message}`);
      runFinalTests();
    });
    
  } catch (error) {
    printTestResult('Firestore Connection', false, `Connection error: ${error.message}`);
    runFinalTests();
  }
} else {
  printTestResult('Firestore Connection', false, 'Skipped - Firebase Admin not initialized');
  runFinalTests();
}

// Test 5: FirestoreService
function testFirestoreService() {
  console.log('5. Testing FirestoreService...');
  if (testResults.firebaseAdminInit) {
    try {
      // Import our FirestoreService
      const { FirestoreService } = require('./dist/services/database/firestoreService');
      const firestoreService = FirestoreService.getInstance();
      
      // Initialize the service
      firestoreService.initialize();
      
      // Test basic functionality
      try {
        const db = firestoreService.getDB();
        if (db) {
          testResults.firestoreService = true;
          printTestResult('FirestoreService', true, 'Service initialized and database instance available');
        } else {
          printTestResult('FirestoreService', false, 'Service initialized but database instance is null');
        }
      } catch (error) {
        printTestResult('FirestoreService', false, `Service error: ${error.message}`);
      }
      
      printFinalSummary();
      
    } catch (error) {
      printTestResult('FirestoreService', false, `Service error: ${error.message}`);
      printFinalSummary();
    }
  } else {
    printTestResult('FirestoreService', false, 'Skipped - Firebase Admin not initialized');
    printFinalSummary();
  }
}

// Run final tests
function runFinalTests() {
  setTimeout(() => {
    testFirestoreService();
  }, 1000);
}

// Print final summary
function printFinalSummary() {
  console.log('📊 Test Summary');
  console.log('===============');
  console.log(`Environment Variables: ${testResults.environmentVariables ? '✅' : '❌'}`);
  console.log(`Service Account File: ${testResults.serviceAccountFile ? '✅' : '❌'}`);
  console.log(`Firebase Admin Init: ${testResults.firebaseAdminInit ? '✅' : '❌'}`);
  console.log(`Firestore Connection: ${testResults.firestoreConnection ? '✅' : '❌'}`);
  console.log(`FirestoreService: ${testResults.firestoreService ? '✅' : '❌'}`);

  const allPassed = Object.values(testResults).every(result => result === true);

  console.log('\n🎯 Overall Result:');
  if (allPassed) {
    console.log('✅ All tests passed! Firebase configuration is working correctly.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please check the configuration.');
    console.log('\n💡 Troubleshooting Tips:');
    
    if (!testResults.environmentVariables) {
      console.log('- Set the required environment variables in your .env file');
      console.log('- Make sure FIREBASE_PRIVATE_KEY includes proper newline characters (\\n)');
    }
    
    if (!testResults.serviceAccountFile) {
      console.log('- Download the service account JSON file from Firebase Console');
      console.log('- Place it in the project root or set FIREBASE_SERVICE_ACCOUNT_PATH');
    }
    
    if (!testResults.firebaseAdminInit) {
      console.log('- Check your Firebase project ID and credentials');
      console.log('- Ensure the service account has proper permissions');
    }
    
    if (!testResults.firestoreConnection) {
      console.log('- Verify Firestore is enabled in your Firebase project');
      console.log('- Check your network connection and firewall settings');
    }
    
    process.exit(1);
  }
}