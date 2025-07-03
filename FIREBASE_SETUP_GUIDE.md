# Firebase Setup Guide for Asset Survey Mapping

This guide will help you set up Firebase for your Asset Survey Mapping application, providing a reliable alternative to Supabase.

## Why Firebase?

Firebase offers several advantages for this application:

1. **Reliability**: Firebase has excellent uptime and connection stability
2. **Scalability**: Easily scales with your user base
3. **Comprehensive Services**: Authentication, database, storage, and hosting in one platform
4. **Simplified Security Rules**: More intuitive than Supabase RLS policies
5. **Excellent Documentation**: Well-documented APIs and extensive examples

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "Asset Survey Mapping")
4. Follow the setup wizard (you can disable Google Analytics if you prefer)
5. Click "Create project"

## Step 2: Set Up Firebase Authentication

1. In the Firebase Console, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Enable the "Email/Password" sign-in method
4. Save your changes

## Step 3: Create a Firestore Database

1. In the Firebase Console, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Start in production mode
4. Choose a location closest to your users
5. Click "Enable"

## Step 4: Set Up Security Rules

1. In the Firestore Database section, go to the "Rules" tab
2. Replace the default rules with the following:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Projects rules
    match /projects/{projectId} {
      allow read, write: if request.auth != null && request.resource.data.user_id == request.auth.uid;
    }
    
    // Assets rules
    match /assets/{assetId} {
      allow read, write: if request.auth != null && request.resource.data.user_id == request.auth.uid;
    }
    
    // Layers rules
    match /layers/{layerId} {
      allow read, write: if request.auth != null && request.resource.data.user_id == request.auth.uid;
    }
  }
}
```

3. Click "Publish"

## Step 5: Get Your Firebase Configuration

1. In the Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click the web app icon (</>) to create a new web app
4. Register your app with a nickname (e.g., "Asset Survey Web")
5. Copy the firebaseConfig object

## Step 6: Update Your Code

1. Open `src/lib/firebase.ts` in your project
2. Replace the placeholder firebaseConfig with your actual configuration:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 7: Test Your Application

1. Run your application locally
2. Sign up for a new account
3. Create a project and add some assets
4. Verify that everything works without connection errors

## Firebase vs. Supabase

### Advantages of Firebase

- **Reliability**: More stable connections, fewer timeouts
- **Simpler Security Model**: Security rules are more intuitive than RLS
- **Mature Platform**: Well-established with years of production use
- **Offline Support**: Built-in offline capabilities
- **Realtime Updates**: Easy to implement realtime data syncing

### Limitations

- **Vendor Lock-in**: More tied to Google's ecosystem
- **Query Limitations**: Some complex queries are harder to express
- **Pricing**: Can become expensive at scale (though free tier is generous)

## Troubleshooting

If you encounter any issues:

1. **Authentication Problems**:
   - Check that Email/Password authentication is enabled
   - Verify your Firebase configuration values

2. **Database Access Issues**:
   - Review your security rules
   - Check the Firebase console logs for security rule violations

3. **Connection Problems**:
   - Firebase has excellent connection reliability, but check your internet connection
   - Look for any console errors related to Firebase initialization

## Next Steps

Once your basic setup is working, you might want to explore:

1. **Firebase Storage**: For storing larger files like images
2. **Firebase Hosting**: For deploying your application
3. **Firebase Functions**: For server-side logic
4. **Firestore Indexes**: For optimizing complex queries

For more information, refer to the [Firebase Documentation](https://firebase.google.com/docs).