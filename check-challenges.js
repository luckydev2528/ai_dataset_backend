const { ChallengeModel } = require('./dist/services/database/models/challengeModel');
const { initializeFirebaseAdmin } = require('./dist/services/auth/firebaseAdmin');

async function checkChallenges() {
  try {
    await initializeFirebaseAdmin();
    console.log('🔍 Fetching all challenges from database...');
    const challenges = await ChallengeModel.getChallenges();
    console.log('📊 Total challenges found:', challenges.length);
    challenges.forEach(challenge => {
      console.log('- Challenge:', JSON.stringify(challenge, null, 2));
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

checkChallenges();
