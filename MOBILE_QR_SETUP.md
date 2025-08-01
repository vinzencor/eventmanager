# Mobile QR Code Setup Guide

## 🎯 Your Current Setup
- **Local Development**: http://localhost:3000 (and http://192.168.1.16:3000)
- **Vercel Production**: https://eventmanager-indol.vercel.app
- **Issue**: QR codes pointing to Vercel instead of local development

## 🔧 SOLUTION OPTIONS

### Option 1: Use Local Development (Recommended for Testing)

**Step 1: Update Environment Configuration**
The `.env.local` file has been updated to use your network IP:
```
REACT_APP_REGISTRATION_URL=http://192.168.1.16:3000
```

**Step 2: Restart Development Server**
```bash
# Stop current server (Ctrl+C)
npm start
```

**Step 3: Create New Events**
- **Important**: Old events may still have Vercel URLs
- **Create a fresh event** to get the new local URL
- **Check registration URL** in event preview

**Step 4: Test Mobile Access**
- **Ensure mobile is on same WiFi network**
- **Scan QR code** → Should open `http://192.168.1.16:3000/register/...`
- **Should work without authentication**

### Option 2: Use Vercel Production (For Real Deployment)

**Step 1: Update Vercel Firestore Rules**
Your Vercel app needs the same Firestore rules as local:

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select project**: `event-management-90b33`
3. **Firestore Database** → **Rules**
4. **Ensure rules allow public registration**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null;
    }
    
    match /events/{eventId} {
      allow read: if true; // PUBLIC ACCESS for QR codes
      allow write: if request.auth != null;
      allow update: if true; // Allow ticket updates
    }
    
    match /registrations/{registrationId} {
      allow read: if request.auth != null;
      allow create: if true; // PUBLIC ACCESS for registration
    }
  }
}
```

**Step 2: Update Environment for Production**
Change `.env.local` to:
```
REACT_APP_REGISTRATION_URL=https://eventmanager-indol.vercel.app
```

**Step 3: Deploy to Vercel**
- **Push changes to GitHub** (if connected)
- **Or redeploy manually**
- **Create events on Vercel** → QR codes will use Vercel URLs

## 🚀 QUICK TEST STEPS

### For Local Development:
1. **Restart server**: `npm start`
2. **Create new event** on http://localhost:3000
3. **Check registration URL**: Should show `http://192.168.1.16:3000/register/...`
4. **Test on mobile**: Scan QR code (same WiFi network)

### For Production:
1. **Update `.env.local`** to use Vercel URL
2. **Deploy to Vercel**
3. **Create event on Vercel**
4. **Test QR code**: Should work from anywhere with internet

## 🔍 DEBUGGING

### Check Registration URL
In event preview, look for:
- ✅ `http://192.168.1.16:3000/register/...` (local development)
- ✅ `https://eventmanager-indol.vercel.app/register/...` (production)
- ❌ Wrong URL = need to restart server or create new event

### Test Direct Access
**Local**: http://192.168.1.16:3000/register/[qr-code-id]
**Production**: https://eventmanager-indol.vercel.app/register/[qr-code-id]

### Console Logs
Check for: `Generated registration URL: [expected-url]`

## 📱 MOBILE NETWORK REQUIREMENTS

### Local Development:
- **Mobile and computer** must be on **same WiFi network**
- **Computer IP**: 192.168.1.16 (as shown in terminal)
- **Mobile access**: http://192.168.1.16:3000

### Production:
- **Any internet connection** works
- **Global access** via https://eventmanager-indol.vercel.app

## 🎯 RECOMMENDED WORKFLOW

1. **Development**: Use local server with network IP
2. **Testing**: Create events locally, test QR codes on mobile
3. **Production**: Deploy to Vercel with production URL
4. **Live Events**: Use Vercel for real events with public access

The key is ensuring the environment variable matches your intended deployment target!
