const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Load env from current working directory .env; fallback to drr-backend/.env
dotenv.config();
if (!process.env.FIREBASE_PROJECT_ID) {
	const altEnvPath = path.resolve(__dirname, '..', '.env');
	if (fs.existsSync(altEnvPath)) {
		dotenv.config({ path: altEnvPath });
	}
}

function required(name, value) {
	if (!value) {
		throw new Error(`${name} is required`);
	}
	return value;
}

function normalizeBucketName(raw) {
	const trimmed = String(raw || '').trim();
	if (trimmed.startsWith('gs://')) {
		return trimmed.slice(5);
	}
	return trimmed;
}

async function main() {
	// Usage:
	// node scripts/uploadToFirebaseStorage.js --file ./local/path.mp4 --dest videos/demo/path.mp4 [--contentType video/mp4] [--public]
	const args = process.argv.slice(2);
	const argMap = {};
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a.startsWith('--')) {
			const key = a.replace(/^--/, '');
			const next = args[i + 1];
			if (!next || next.startsWith('--')) {
				argMap[key] = true;
			} else {
				argMap[key] = next;
				i++;
			}
		}
	}

	const filePath = String(required('--file', argMap.file));
	const destination = String(required('--dest', argMap.dest));
	const contentType = argMap.contentType || undefined;
	const makePublic = Boolean(argMap.public);

	if (!fs.existsSync(filePath)) {
		throw new Error(`File does not exist: ${filePath}`);
	}

	// Environment variables (Service Account based auth)
	const projectId = required('FIREBASE_PROJECT_ID', process.env.FIREBASE_PROJECT_ID);
	const clientEmail = required('FIREBASE_CLIENT_EMAIL', process.env.FIREBASE_CLIENT_EMAIL);
	const privateKeyRaw = required('FIREBASE_PRIVATE_KEY', process.env.FIREBASE_PRIVATE_KEY);
	const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
	const bucketEnv = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
	const bucketName = normalizeBucketName(bucketEnv);

	if (admin.apps.length === 0) {
		admin.initializeApp({
			credential: admin.credential.cert({
				projectId,
				clientEmail,
				privateKey,
			}),
			storageBucket: bucketName,
		});
	}

	const bucket = admin.storage().bucket();

	const uploadOptions = {
		destination,
		contentType,
		metadata: {
			contentType,
			metadata: {
				uploadedBy: 'uploadToFirebaseStorage.js',
				uploadedAt: new Date().toISOString(),
				originalFileName: path.basename(filePath),
			},
		},
		resumable: true,
		validation: 'crc32c',
	};

	console.log(`\uD83D\uDD27 Project: ${projectId}`);
	console.log(`\uD83E\uDEA3\uFE0F Bucket: ${bucketName}`);
	console.log(`\uD83D\uDCC1 Local file: ${path.resolve(filePath)}`);
	console.log(`\uD83C\uDFAF Destination: ${destination}`);

	const [uploadedFile] = await bucket.upload(filePath, uploadOptions);

	if (makePublic) {
		await uploadedFile.makePublic();
	}

	const publicUrl = `https://storage.googleapis.com/${bucketName}/${encodeURI(destination)}`;
	const [meta] = await uploadedFile.getMetadata();

	console.log('✅ Upload complete');
	console.log('   • name:', uploadedFile.name);
	console.log('   • size (bytes):', meta && meta.size);
	console.log('   • contentType:', meta && meta.contentType);
	if (makePublic) {
		console.log('   • publicUrl:', publicUrl);
	}
}

main().catch((err) => {
	console.error('❌ Upload failed:', err && (err.message || err));
	process.exit(1);
});


