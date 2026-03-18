# Firebase Setup Guide - SAPE Gala 2026

## Overview
This guide will help you set up Firebase for your ticketing system to handle 800 ticket slots with cloud database, real-time updates, and multi-device access.

---

## Step 1: Create Firebase Project (10 minutes)

### 1.1 Go to Firebase Console
- Visit: https://console.firebase.google.com
- Sign in with your Google account
- Click **"Add project"** or **"Create a project"**

### 1.2 Configure Project
1. **Project name**: Enter `sape-gala-2026` (or your preferred name)
2. Click **Continue**
3. **Google Analytics**: Toggle ON (recommended for tracking)
4. Click **Continue**
5. **Analytics account**: Select existing or create new
6. Click **Create project**
7. Wait 30-60 seconds for setup
8. Click **Continue** when ready

✅ **Your Firebase project is now created!**

---

## Step 2: Enable Firestore Database (5 minutes)

### 2.1 Create Database
1. In Firebase Console, click **"Build"** in left sidebar
2. Click **"Firestore Database"**
3. Click **"Create database"**

### 2.2 Choose Security Mode
- Select **"Start in production mode"** (we'll configure rules next)
- Click **Next**

### 2.3 Choose Location
- Select the closest region to Kenya:
  - Recommended: `eur3 (europe-west)` 
  - Alternative: `asia-south1 (Mumbai)`
- ⚠️ **IMPORTANT**: You cannot change this later!
- Click **Enable**

### 2.4 Wait for Database Creation
- Takes 1-2 minutes
- You'll see "Cloud Firestore" dashboard when ready

✅ **Firestore database is ready!**

---

## Step 3: Configure Security Rules (3 minutes)

### 3.1 Deploy Database Rules
1. Keep the committed rules file at the project root: `firestore.rules`
2. Deploy it with Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

3. Confirm the deployed rules block direct public ticket reads and writes
4. Confirm authenticated staff can still access tickets through the staff portal

✅ **Security rules configured!**

---

## Step 4: Get Your Configuration Keys (5 minutes)

### 4.1 Register Web App
1. Go to Firebase Console home (click the home icon)
2. Click the **"</>"** icon (Web app) in "Get started by adding Firebase to your app"
3. **App nickname**: Enter `SAPE Gala Website`
4. **✓ Check** "Also set up Firebase Hosting" (optional, for deployment)
5. Click **"Register app"**

### 4.2 Copy Configuration
You'll see a configuration like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC_example_key_1234567890",
  authDomain: "sape-gala-2026.firebaseapp.com",
  projectId: "sape-gala-2026",
  storageBucket: "sape-gala-2026.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

### 4.3 Copy Your Values
**Write down or copy these 6 values:**
1. ✏️ apiKey: `_________________`
2. ✏️ authDomain: `_________________`
3. ✏️ projectId: `_________________`
4. ✏️ storageBucket: `_________________`
5. ✏️ messagingSenderId: `_________________`
6. ✏️ appId: `_________________`

Click **"Continue to console"** when done.

✅ **Configuration keys obtained!**

---

## Step 5: Update Your Website Code (2 minutes)

### 5.1 Open firebase-config.js
Open the file: `C:\Users\kyalo\nairobi-sape-gala\firebase-config.js`

### 5.2 Find This Section (lines 5-11):
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 5.3 Replace with YOUR values:
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyC_YOUR_ACTUAL_KEY",              // Paste your apiKey
    authDomain: "sape-gala-2026.firebaseapp.com",   // Paste your authDomain
    projectId: "sape-gala-2026",                     // Paste your projectId
    storageBucket: "sape-gala-2026.appspot.com",    // Paste your storageBucket
    messagingSenderId: "123456789012",               // Paste your messagingSenderId
    appId: "1:123456789012:web:abc123def456"        // Paste your appId
};
```

### 5.4 Save the File
- Press `Ctrl + S` to save
- Close the file

✅ **Configuration updated!**

---

## Step 6: Test the Connection (3 minutes)

### 6.1 Open Your Website
1. Open `index.html` in your browser
2. Press `F12` to open Developer Console
3. Look for this message:
   - ✅ `"✅ Firebase initialized successfully"`
   - ❌ If you see `"⚠️ Firebase not configured"`, check your config keys

### 6.2 Create a Test Ticket
1. Click **"Get Your Ticket"**
2. Fill in test data:
   - Name: Test User
   - Email: test@example.com
   - Phone: +254700000000
   - Ticket Type: Standard Ticket
3. Click **"Complete Purchase"**
4. If successful, you'll see the ticket modal

### 6.3 Verify in Firebase Console
1. Go back to Firebase Console
2. Click **Firestore Database**
3. You should see a **"tickets"** collection
4. Click on it to see your test ticket
5. You should see the ticket ID and all data

**If you see the data in Firestore → SUCCESS! 🎉**

✅ **Firebase is working!**

---

## Step 7: Enable Ticket Capacity Limit (Optional)

To limit ticket sales to 800 slots:

### 7.1 Create a Counter Document
1. In Firestore Console, click **"Start collection"**
2. Collection ID: `settings`
3. Document ID: `ticketConfig`
4. Add fields:
   - Field: `maxCapacity`, Type: number, Value: `800`
   - Field: `currentSold`, Type: number, Value: `0`
5. Click **"Save"**

### 7.2 Add Validation to Code
I can help you add code to check capacity before selling tickets. Let me know if you want this feature!

---

## Step 8: Set Up Staff Authentication (Recommended)

To secure the staff check-in portal:

### 8.1 Enable Authentication
1. In Firebase Console → **Build** → **Authentication**
2. Click **"Get started"**
3. Click **"Email/Password"**
4. Toggle **Enable**
5. Click **"Save"**

### 8.2 Create Staff Accounts
1. Go to **Authentication** → **Users** tab
2. Click **"Add user"**
3. Create accounts for your staff:
   - Email: `staff1@sapegala.com`
   - Password: (choose secure password)
4. Repeat for all staff members

### 8.3 Confirm Secure Access Model
- Ticket creation is handled by the `createTicket` Cloud Function
- Firestore rules should continue to deny direct public ticket creation and reads
- Only authenticated staff should read, update, or delete tickets

I can add login functionality to your staff portal if you'd like!

---

## ✅ Verification Checklist

After setup, verify these work:

- [ ] Firebase Console shows your project
- [ ] Firestore Database is created and active
- [ ] Browser console shows "Firebase initialized successfully"
- [ ] Test ticket appears in Firestore Database
- [ ] Staff check-in portal can scan and find tickets
- [ ] Guest list shows all tickets from database

---

## 📊 Expected Performance for 800 Tickets

### Firebase Free Tier Limits:
- ✅ **Stored data**: 1 GB (you'll use ~10 MB for 800 tickets)
- ✅ **Document reads**: 50,000/day (more than enough)
- ✅ **Document writes**: 20,000/day (plenty for 800 purchases)
- ✅ **Cost**: **$0.00** - Completely FREE for your event size!

### Estimated Usage:
- **Storage**: ~12.5 KB per ticket × 800 = ~10 MB total
- **Reads**: ~3,200 reads on event day (checking in + guest list)
- **Writes**: 800 ticket creations + 800 check-ins = 1,600 writes

**You're using less than 5% of the free tier! 🎉**

---

## 🆘 Troubleshooting

### Problem: "Firebase not configured" message
**Solution**: 
- Check that you replaced ALL 6 config values
- Make sure there are no extra spaces or quotes
- Verify apiKey doesn't have "YOUR_API_KEY_HERE"

### Problem: "Permission denied" error
**Solution**:
- Check Firestore Rules are set to allow public access
- Click "Publish" after changing rules
- Wait 30 seconds for rules to propagate

### Problem: Data not showing in Firestore
**Solution**:
- Check browser console for errors
- Verify you're looking at the correct Firebase project
- Try creating another test ticket

### Problem: Website shows old localStorage data
**Solution**:
- Clear browser localStorage:
  - Press F12 → Console tab
  - Type: `localStorage.clear()`
  - Press Enter
  - Refresh page

---

## 🎯 Next Steps After Firebase Setup

Once Firebase is working:

1. **Test Thoroughly**
   - Create 5-10 test tickets
   - Test staff check-in from another device
   - Verify guest list accuracy

2. **Add Payment Integration** (recommended)
   - M-Pesa Daraja API for Kenya
   - Or Stripe for international cards
   - Or Flutterwave for African payments

3. **Enable Email Notifications**
   - Set up Firebase Cloud Functions
   - Integrate SendGrid or Mailgun
   - Send tickets via email automatically

4. **Deploy to Custom Domain**
   - Use Firebase Hosting (free)
   - Or any web hosting service
   - Enable HTTPS for security

5. **Add Analytics**
   - Track ticket sales in real-time
   - Monitor check-in rates
   - Generate reports

---

## 📞 Support Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **Firestore Guide**: https://firebase.google.com/docs/firestore
- **Firebase Console**: https://console.firebase.google.com
- **Community Support**: https://stackoverflow.com/questions/tagged/firebase

---

## 🎉 You're Ready!

After completing these steps, your ticketing system will:
- ✅ Store all 800 tickets in the cloud
- ✅ Allow staff to check in guests from any device
- ✅ Provide real-time updates across all devices
- ✅ Keep data safe with automatic backups
- ✅ Scale to handle peak traffic during ticket sales
- ✅ Cost you $0.00 (Free tier is sufficient!)

**Time to complete setup: ~30 minutes**

Good luck with your SAPE Gala 2026! 🎊
