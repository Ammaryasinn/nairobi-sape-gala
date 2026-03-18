# Nairobi SAPE Gala 2026 - Ticket Management System

## 🎟️ Features

### Public Website
- ✅ Event details and information page
- ✅ Protected checkout flow with server-side ticket creation
- ✅ Automatic ticket generation with unique IDs
- ✅ QR code generation for each ticket
- ✅ Downloadable ticket images
- ✅ Email confirmations (with Firebase setup)

### Staff Check-In Portal
- 🔐 Firebase-authenticated access (`/staff-login.html`)
- 📱 Mobile-friendly interface
- 📷 QR code scanner using device camera
- 🔍 Manual search by ticket ID or guest name
- 📊 Live dashboard statistics
- ✅ Real-time check-in validation
- 👥 Complete guest list with filtering
- 🔄 Auto-refresh every 10 seconds

## 🚀 Quick Start

### Option 1: Secure Firebase Setup (Recommended)
1. Open `index.html` in your browser
2. Navigate to the payment page and complete an order
3. Access staff portal at `staff-login.html`
4. Sign in with a Firebase Authentication staff account

### Option 2: Production Mode with Firebase

#### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Name it (e.g., "Nairobi-SAPE-Gala")
4. Follow the setup wizard

#### Step 2: Enable Firestore Database
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode"
4. Select your preferred location

#### Step 3: Get Firebase Configuration
1. Go to Project Settings (⚙️ icon)
2. Scroll to "Your apps" section
3. Click the web icon `</>`
4. Copy the `firebaseConfig` object

#### Step 4: Update firebase-config.js
Replace the configuration in `firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

#### Step 5: Deploy Firestore Rules
Deploy the committed `firestore.rules` file:

```bash
firebase deploy --only firestore:rules
```

#### Step 6: Enable Email Notifications (Optional)
To send ticket confirmations via email:

1. Enable Firebase Functions in your project
2. Install Firebase CLI: `npm install -g firebase-tools`
3. Initialize functions: `firebase init functions`
4. Create the email function (see `email-function-template.js`)
5. Deploy: `firebase deploy --only functions`

## 📂 File Structure

```
nairobi-sape-gala/
├── index.html              # Main event page
├── payment.html            # Ticket purchase page
├── staff-checkin.html      # Staff check-in portal
├── styles.css              # All styling
├── script.js               # Main website scripts
├── firebase-config.js      # Firebase configuration & database helpers
├── payment-handler.js      # Ticket generation logic
├── staff-checkin.js        # Check-in portal logic
└── README.md              # This file
```

## 🎫 Ticket Purchase Flow

1. **Customer fills out form** → Name, email, phone, ticket type
2. **System generates** → Unique ticket ID (e.g., SAPE2026-A1B2C3D4)
3. **QR code created** → Contains ticket ID
4. **Saved to database** → Secure backend function writes to Firestore
5. **Email sent** → Ticket + QR code (if Firebase configured)
6. **Success modal** → Shows ticket details and download option

## 🔍 Check-In Process

### Method 1: QR Code Scanner
1. Staff clicks "Start Camera"
2. Points camera at guest's QR code
3. System automatically validates
4. If valid, shows check-in button
5. Click to complete check-in

### Method 2: Manual Search
1. Staff enters ticket ID or guest name
2. System searches database
3. Shows validation result
4. Click check-in if valid

### Validation States
- ✅ **VALID TICKET** (Green) - Not yet checked in, ready to admit
- ⚠️ **ALREADY CHECKED IN** (Yellow) - Already used, shows check-in time
- ❌ **INVALID TICKET** (Red) - Not found in system

## 📊 Dashboard Statistics

The staff portal displays real-time stats:
- **Total Tickets** - All tickets sold
- **Checked In** - Guests who arrived
- **Remaining** - Outstanding tickets

Updates automatically every 10 seconds.

## 🔒 Security

### Staff Portal Access
- Staff sign-in is handled with Firebase Authentication
- Ticket data is readable only by authenticated staff users
- Ticket creation is handled through a backend Cloud Function

### Production Recommendations
1. Keep `RESEND_API_KEY` in environment variables only
2. Use Firebase Hosting for SSL/HTTPS
3. Deploy `firestore.rules`
4. Keep trusted origins updated for Cloud Functions
5. Integrate a certified payment gateway before enabling card payments

## 🎨 Customization

### Change Color Scheme
Edit CSS variables in `styles.css`:
```css
:root {
    --gold: #c59b64;        /* Primary brand color */
    --dark-gold: #a37e47;   /* Darker shade */
    --light-gold: #d4b382;  /* Lighter shade */
    --black: #0a0a0a;       /* Background */
    --dark-gray: #1a1a1a;   /* Secondary background */
    --cream: #f5f3ef;       /* Text color */
    --ivory: #fdfbf7;       /* Light text */
}
```

### Change Ticket Prices
Edit in `payment.html`:
```html
<select id="ticketType" class="ticket-select">
    <option value="5000">VIP - KES 5,000</option>
    <option value="3000">Standard - KES 3,000</option>
    <option value="7500">Table for 2 - KES 7,500</option>
</select>
```

### Change Event Details
Edit event information in:
- `index.html` - Main event page
- `payment.html` - Ticket summary sidebar
- `payment-handler.js` - Downloadable ticket template

## 📧 Email Template

When Firebase Functions are set up, tickets are emailed using the template in `email-template.html`. The email includes:
- Event branding
- Ticket details
- QR code image
- Event date and venue
- Check-in instructions

## 🐛 Troubleshooting

### QR Scanner Not Working
- **Allow camera permissions** in browser
- **Use HTTPS** - QR scanner requires secure connection
- Try different browser (Chrome/Safari work best)

### Tickets Not Saving
- Check browser console for errors
- Verify Firebase configuration
- Check Firestore rules allow writes

### Email Not Sending
- Verify Firebase Functions are deployed
- Check function logs in Firebase Console
- Ensure email service is configured

## 📱 Browser Compatibility

- ✅ Chrome (recommended)
- ✅ Safari
- ✅ Firefox
- ✅ Edge
- ⚠️ Mobile browsers (QR scanner works on iOS Safari, Android Chrome)

## 🚀 Deployment

### Option 1: Firebase Hosting (Recommended)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Option 2: Any Web Host
Upload all files to your web server:
- Supports GitHub Pages
- Netlify
- Vercel
- Any static hosting

### Option 3: Local Testing
Simply open `index.html` in a browser (localhost for QR scanner)

## 💡 Tips

1. **Test thoroughly** before the event
2. **Train staff** on check-in process
3. **Have backup** manual list printed
4. **Charge devices** staff will use for check-in
5. **Test QR scanner** in event lighting conditions
6. **Have Wi-Fi backup** (mobile hotspot)

## 📞 Support

For issues or questions:
1. Check browser console for error messages
2. Verify Firebase configuration
3. Test in demo mode (localStorage) first
4. Check all files are uploaded correctly

## 📄 License

Copyright © 2026 Nairobi SAPE Gala. All rights reserved.

---

**Built with:** HTML5, CSS3, JavaScript, Firebase, html5-qrcode, QRCode.js

**Event Date:** 16 May 2026  
**Venue:** Sarit Center Conference Hall, Nairobi, Kenya  
**Theme:** Style, Culture & Opportunity
