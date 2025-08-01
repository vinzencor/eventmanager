# Email Ticket System Setup Guide

## 🎯 Overview
The system now automatically sends email tickets to users after successful registration with:
- Event details and image
- Unique ticket number
- Verification QR code for admin scanning
- Professional email template

## 🔧 EmailJS Setup (Required)

### Step 1: Create EmailJS Account
1. **Go to**: https://emailjs.com
2. **Sign up** for a free account
3. **Verify your email** address

### Step 2: Create Email Service
1. **Go to Email Services** in EmailJS dashboard
2. **Click "Add New Service"**
3. **Choose your email provider** (Gmail, Outlook, etc.)
4. **Follow setup instructions** for your provider
5. **Note the Service ID** (e.g., `service_abc123`)

### Step 3: Create Email Template
1. **Go to Email Templates** in EmailJS dashboard
2. **Click "Create New Template"**
3. **Use this template content**:

```html
Subject: 🎫 Your Event Ticket - {{event_title}}

<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Event Ticket</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎫 Event Ticket</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your admission pass</p>
        </div>
        
        <!-- Event Image -->
        {{#if event_image}}
        <img src="{{event_image}}" alt="Event" style="width: 100%; height: 200px; object-fit: cover;">
        {{/if}}
        
        <!-- Content -->
        <div style="padding: 30px;">
            <h2 style="color: #333; margin-top: 0;">{{event_title}}</h2>
            
            <!-- Ticket Number -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                <div style="font-size: 18px; font-weight: bold; color: #333;">
                    Ticket #{{ticket_number}}
                </div>
            </div>
            
            <!-- Event Details -->
            <div style="margin: 20px 0;">
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                    <strong>Attendee:</strong>
                    <span>{{to_name}}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                    <strong>Date:</strong>
                    <span>{{event_date}}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                    <strong>Time:</strong>
                    <span>{{event_time}}</span>
                </div>
                {{#if event_location}}
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                    <strong>Location:</strong>
                    <span>{{event_location}}</span>
                </div>
                {{/if}}
                {{#if time_slot}}
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                    <strong>Time Slot:</strong>
                    <span>{{time_slot}}</span>
                </div>
                {{/if}}
            </div>
            
            <!-- QR Code Section -->
            <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 5px;">
                <h3 style="color: #333; margin-top: 0;">🔍 Verification QR Code</h3>
                <p style="color: #666; margin: 10px 0;">Show this QR code at the event entrance</p>
                <div style="margin: 20px 0;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={{verification_qr}}" 
                         alt="Verification QR Code" 
                         style="border: 2px solid #ddd; border-radius: 5px;">
                </div>
                <p style="font-size: 12px; color: #666; margin: 0;">This QR code is unique to your ticket</p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f8f9fa;">
            <p style="margin: 0 0 10px 0;">Thank you for registering! Please arrive 15 minutes before your scheduled time.</p>
            <p style="margin: 0;">For support, contact the event organizer.</p>
        </div>
    </div>
</body>
</html>
```

4. **Save the template** and note the Template ID (e.g., `template_xyz789`)

### Step 4: Get Public Key
1. **Go to Account** in EmailJS dashboard
2. **Copy your Public Key** (e.g., `user_abc123xyz`)

### Step 5: Update Environment Variables
Update your `.env.local` file:

```env
REACT_APP_EMAILJS_SERVICE_ID=service_abc123
REACT_APP_EMAILJS_TEMPLATE_ID=template_xyz789
REACT_APP_EMAILJS_PUBLIC_KEY=user_abc123xyz
```

## 🚀 Testing the Email System

### Step 1: Restart Development Server
```bash
npm start
```

### Step 2: Test Registration
1. **Create a new event**
2. **Register for the event** using QR code or direct link
3. **Check email inbox** for ticket email
4. **Verify QR code** is included in email

### Step 3: Test QR Verification
1. **Go to**: `/admin/events/{eventId}/scan`
2. **Scan or manually enter** the QR code from email
3. **Should show**: "Valid ticket - Entry approved"

## 🎯 Features Implemented

### ✅ Email Tickets
- **Automatic sending** after registration
- **Professional template** with event image
- **Unique ticket numbers** (TKT-XXXXX-XXXXX format)
- **Verification QR codes** for security

### ✅ QR Verification System
- **Admin scanner interface** at `/admin/events/{eventId}/scan`
- **Camera scanning** and manual input
- **Real-time verification** with detailed feedback
- **Prevents duplicate entries** (tickets can only be used once)

### ✅ Enhanced Admin Features
- **Super Admin**: Create, view, edit, delete all events
- **Temp Admin**: View, edit, delete their own events
- **QR Scanner**: Verify tickets at event entrance
- **Real-time updates** across all dashboards

## 🔍 Troubleshooting

### Email Not Sending
1. **Check EmailJS credentials** in `.env.local`
2. **Verify EmailJS service** is active
3. **Check browser console** for error messages
4. **Test EmailJS template** directly in dashboard

### QR Code Not Working
1. **Check QR code format** in email
2. **Verify event ID** matches
3. **Check Firestore rules** allow public access
4. **Test manual QR input** in scanner

### Admin Features Not Working
1. **Check user role** (super_admin or temp_admin)
2. **Verify Firebase authentication**
3. **Check route permissions** in App.js

## 📱 Mobile Compatibility

- **QR Scanner**: Works on mobile browsers with camera access
- **Email Tickets**: Mobile-responsive email template
- **Admin Interface**: Touch-friendly buttons and layout
- **Registration**: Mobile-optimized forms

The system is now fully functional with professional email tickets and secure QR verification!
