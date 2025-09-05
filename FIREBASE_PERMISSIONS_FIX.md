# Firebase Permissions Fix

## Issue
The Firebase service account is missing required permissions to access the Firebase Authentication service. The error shows:

```
Caller does not have required permission to use project datarefinery-6db5e. 
Grant the caller the roles/serviceusage.serviceUsageConsumer role
```

## Solution

### Step 1: Go to Google Cloud Console
1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `datarefinery-6db5e`

### Step 2: Navigate to IAM & Admin
1. Go to **IAM & Admin** > **IAM**
2. Find your Firebase service account (usually named `firebase-adminsdk-xxxxx@datarefinery-6db5e.iam.gserviceaccount.com`)

### Step 3: Grant Required Permissions
Add these roles to your service account:

1. **Firebase Authentication Admin** - This is the main role needed
2. **Service Usage Consumer** - Required for API access
3. **Firebase Admin** - For full Firebase access

### Step 4: Alternative - Create New Service Account
If the above doesn't work, create a new service account:

1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name: `firebase-admin-service`
4. Grant these roles:
   - Firebase Authentication Admin
   - Service Usage Consumer
   - Firebase Admin
5. Create and download the JSON key
6. Update your environment variables with the new service account details

### Step 5: Update Environment Variables
Update your `.env` file with the correct service account details:

```env
FIREBASE_PROJECT_ID=datarefinery-6db5e
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_NEW_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@datarefinery-6db5e.iam.gserviceaccount.com
```

### Step 6: Restart the Server
After updating permissions, restart your backend server:

```bash
npm run dev
```

## Verification
Once fixed, you should see:
- ✅ Firebase Admin initialized successfully
- No permission errors in the logs
- Successful authentication requests

## Troubleshooting
- Wait 2-3 minutes after granting permissions for them to propagate
- Ensure the service account email matches exactly
- Check that the private key is properly formatted with `\n` for newlines
- Verify the project ID is correct
