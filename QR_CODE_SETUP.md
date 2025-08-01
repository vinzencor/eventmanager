# QR Code Registration Setup Guide

## 🚨 Current Issue
QR codes are redirecting to Vercel app instead of local development server.

## 🔧 IMMEDIATE SOLUTIONS

### Solution 1: Configure Registration URL (Recommended)

The app now uses environment variables to control where QR codes redirect.

**For Local Development:**
1. **File already created**: `.env.local`
2. **Current setting**: `REACT_APP_REGISTRATION_URL=http://localhost:3000`
3. **This ensures QR codes always point to your local server**

### Solution 2: Use Your Computer's Network IP

If you want to test from mobile on the same network:

1. **Find your computer's IP address**:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` (look for inet address)

2. **Update `.env.local`**:
   ```
   REACT_APP_REGISTRATION_URL=http://192.168.1.16:3000
   ```
   (Replace with your actual IP address)

3. **Restart the development server**:
   ```
   npm start
   ```

### Solution 3: Test Registration URL Directly

**Test the registration without QR code:**

1. **Create an event and note the QR code ID**
2. **Visit directly on mobile**: `http://localhost:3000/register/[qr-code-id]`
3. **Or use your IP**: `http://192.168.1.16:3000/register/[qr-code-id]`

## 🚀 TESTING STEPS

### Step 1: Restart Development Server
```bash
# Stop the current server (Ctrl+C)
npm start
```

### Step 2: Create New Event
1. **Login to admin dashboard**
2. **Create a new event** (this will use the new URL configuration)
3. **Check the registration URL** in event preview
4. **Should show**: `http://localhost:3000/register/[qr-code]`

### Step 3: Test QR Code
1. **Generate QR code** from event preview
2. **Scan with mobile** (make sure mobile is on same WiFi network)
3. **Should open**: Local registration form, not Vercel app

## 🔍 DEBUGGING

### Check Registration URL
In event preview, look at the registration URL field. It should show:
- ✅ `http://localhost:3000/register/...` (for local testing)
- ❌ `https://vercel-app.com/register/...` (wrong - points to production)

### Console Logs
Check browser console in event preview for:
```
Generated registration URL: http://localhost:3000/register/[qr-code]
```

## 📱 MOBILE NETWORK ACCESS

### Option A: Same WiFi Network
- **Computer**: `http://localhost:3000`
- **Mobile**: `http://[computer-ip]:3000`
- **QR Code**: Points to computer IP

### Option B: Localhost Only
- **Computer**: `http://localhost:3000`
- **Mobile**: Must use computer browser or network sharing
- **QR Code**: Points to localhost (mobile can't access directly)

## 🎯 RECOMMENDED APPROACH

1. **Use computer's network IP** in `.env.local`
2. **Restart development server**
3. **Create new events** (old events may still have old URLs)
4. **Test QR codes** from mobile on same network

## 🔧 PRODUCTION DEPLOYMENT

For production (Vercel/Netlify/etc.):
1. **Remove or comment out** `REACT_APP_REGISTRATION_URL` in `.env.local`
2. **App will automatically use** the production domain
3. **QR codes will work** on any device with internet access

The key is ensuring QR codes point to the right server for your testing environment!
