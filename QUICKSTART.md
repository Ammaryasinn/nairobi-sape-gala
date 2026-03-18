# 🚀 Quick Start Guide - Nairobi SAPE Gala 2026

## 📋 What You Have

A complete ticket management system with:
- ✅ Public event website with payment page
- ✅ Automatic ticket generation with QR codes
- ✅ Staff check-in portal with QR scanner
- ✅ Real-time dashboard and guest list
- ✅ Email confirmation templates

## 🎯 Three Ways to Use This System

### 1️⃣ DEMO MODE (Test Immediately - No Setup)

**Perfect for:** Testing, training staff, or small private events

**How to use:**
1. Open `index.html` in your browser
2. Click "Get Your Ticket" and fill out the form
3. Complete purchase to generate a ticket
4. Open `staff-checkin.html`
5. Login with your Firebase staff account at `staff-login.html`
6. Test QR scanning or manual search

**Note:** Data stored in browser only (localStorage). Works offline!

---

### 2️⃣ FIREBASE MODE (Recommended for Live Events)

**Perfect for:** Production use, live event, multiple staff devices

**Quick Setup (15 minutes):**

1. **Create Firebase Project**
   - Go to: https://console.firebase.google.com
   - Click "Add project" → Name it → Continue

2. **Enable Firestore**
   - Click "Firestore Database" → "Create database"
   - Choose "Production mode" → Pick location → Enable

3. **Get Your Config**
   - Click ⚙️ (Settings) → Project settings
   - Scroll to "Your apps" → Click web icon `</>`
   - Copy the `firebaseConfig` object

4. **Update `firebase-config.js`**
   ```javascript
   const firebaseConfig = {
       apiKey: "paste-your-api-key",
       authDomain: "your-project.firebaseapp.com",
       projectId: "your-project-id",
       // ... rest of config
   };
   ```

5. **Deploy to Firebase Hosting (Optional)**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy
   ```

**Done!** Your system now syncs across all devices in real-time.

---

### 3️⃣ CUSTOM HOSTING (Any Web Server)

**Perfect for:** If you already have a website or hosting

**Steps:**
1. Upload all files to your web server
2. If using Firebase, update config as shown above
3. If not using Firebase, system uses localStorage (demo mode)
4. Ensure HTTPS for QR camera access

**Compatible with:** GitHub Pages, Netlify, Vercel, cPanel, any static host

---

## 🎫 How Staff Use the Check-In System

### On Event Day:

1. **Setup (5 minutes before doors open)**
   - Open `staff-checkin.html` on phone/tablet
   - Login with your Firebase staff account
   - Check that ticket count looks correct

2. **Check-In Guests (2 methods)**

   **Method A: QR Scanner (Recommended)**
   - Click "Start Camera"
   - Point at guest's QR code
   - System auto-validates
   - Click "Check In Now" if valid

   **Method B: Manual Search**
   - Type ticket ID or guest name
   - Click search
   - Click "Check In Now" if valid

3. **What Staff See:**
   - ✅ **GREEN (Valid)** → Check them in
   - ⚠️ **YELLOW (Already used)** → Escalate to supervisor
   - ❌ **RED (Invalid)** → Ticket not found, escalate

---

## 💡 Pro Tips for Event Day

### Before the Event:
- [ ] Test the QR scanner in actual event lighting
- [ ] Print 1 backup guest list
- [ ] Fully charge all check-in devices
- [ ] Train staff on both check-in methods
- [ ] Create a few test tickets to verify system

### During the Event:
- Dashboard updates every 10 seconds automatically
- Use guest list to search for stragglers
- Yellow warnings = possible duplicate ticket fraud
- If internet fails, system keeps working (shows last loaded data)

### After the Event:
- Download guest list before closing
- Check "Checked In" count matches physical attendance
- Save backup of database

---

## 🔧 Common Issues & Solutions

### QR Scanner Won't Start
- **Cause:** Browser needs camera permission or HTTPS
- **Fix:** Allow camera access, or use `localhost` for testing
- **Alternative:** Use manual search with ticket ID

### Tickets Not Syncing Between Devices
- **Cause:** Firebase not configured or offline
- **Fix:** Check `firebase-config.js` has your project details
- **Workaround:** Use one main check-in device

### Email Not Sending
- **Cause:** Firebase Functions not set up
- **Fix:** Follow email setup in README.md
- **Workaround:** Manually forward ticket details

---

## 📁 Important Files

| File | Purpose | Who Edits |
|------|---------|-----------|
| `index.html` | Main event page | Designer |
| `payment.html` | Ticket purchase | Designer |
| `staff-checkin.html` | Staff portal | No edits needed |
| `firebase-config.js` | Database connection | **You (once)** |
| `styles.css` | Visual design | Designer |
| `README.md` | Full documentation | Reference only |

---

## 🎨 Customization Checklist

### Must Change:
- [ ] Event date/time (if different)
- [ ] Venue name and address
- [ ] Ticket prices
- [ ] Firebase config (for production)
- [ ] Staff password (security)

### Optional Changes:
- [ ] Color scheme (CSS variables)
- [ ] Logo/branding
- [ ] Event description text
- [ ] Social media links

---

## 🆘 Need Help?

1. **Check browser console** (F12) for error messages
2. **Test in demo mode first** (no Firebase needed)
3. **Read full README.md** for detailed instructions
4. **Check Firebase console** for database issues

---

## ✅ Pre-Event Checklist

**1 Week Before:**
- [ ] Website fully tested
- [ ] Firebase configured and working
- [ ] Staff trained on check-in system
- [ ] Test tickets sent to team members
- [ ] Backup plan prepared (printed list)

**1 Day Before:**
- [ ] All devices charged
- [ ] Check-in logins tested
- [ ] Guest list exported as backup
- [ ] QR scanner tested in venue lighting

**Event Day:**
- [ ] Staff login 30 mins early
- [ ] Verify ticket count is correct
- [ ] Test one check-in before doors open

---

## 🎉 You're Ready!

Your Nairobi SAPE Gala ticketing system is complete and production-ready!

**Quick Test Now:**
1. Open `index.html`
2. Buy a ticket
3. Open `staff-login.html` and sign in with your Firebase staff account
4. Scan or search for the ticket
5. Check it in

Everything working? You're good to go! 🚀

---

**Questions?** Check the full README.md or test in demo mode first.

**Event Contact:** Nairobi SAPE Gala 2026  
**Date:** 16 May 2026, 6:00 PM  
**Venue:** Sarit Center Conference Hall, Nairobi, Kenya
