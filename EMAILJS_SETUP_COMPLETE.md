# Complete EmailJS Setup Guide - Fix Email Recipient & Image Issues

## 🚨 Current Issues
1. **Email going to your account instead of user's email**
2. **Event image not visible in email**

## 🔧 SOLUTION 1: Fix Email Recipient

### Step 1: Check EmailJS Service Settings
1. **Go to**: https://emailjs.com → Email Services
2. **Click on your service**: `service_wr1qx99`
3. **Check "To Email" field**:
   - Should be: `{{to_email}}` or `{{user_email}}`
   - Should NOT be: your fixed email address

### Step 2: Update EmailJS Service Configuration
**In your EmailJS service settings:**
- **To Email**: `{{to_email}}`
- **To Name**: `{{to_name}}`
- **From Email**: Your verified email (your account email)
- **From Name**: Event Management System

### Step 3: Template Settings
**In your EmailJS template (`template_nw0ud5d`):**
- **To**: `{{to_email}}`
- **Subject**: `🎫 Your Event Ticket - {{event_title}}`

## 🔧 SOLUTION 2: Fix Image Display

### Option A: Use External Image Hosting
**Problem**: Base64 images don't work well in emails
**Solution**: Upload images to external service

1. **Upload event images to**:
   - Imgur: https://imgur.com
   - Cloudinary: https://cloudinary.com
   - Firebase Storage (if CORS fixed)

2. **Use the direct URL** in email template

### Option B: Always Use Placeholder (Quick Fix)
**Update the email service to always use a working placeholder:**

The system now uses: `https://via.placeholder.com/400x200/667eea/ffffff?text=Event+Image`

## 📧 CORRECTED EMAILJS TEMPLATE

**Copy this EXACT template to your EmailJS template:**

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
        <div style="text-align: center; padding: 20px; background: #f8f9fa;">
            <img src="https://via.placeholder.com/400x200/667eea/ffffff?text={{event_title}}" 
                 alt="{{event_title}}" 
                 style="max-width: 100%; height: 200px; object-fit: cover; border-radius: 8px; border: 2px solid #ddd;">
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
            <h2 style="color: #333; margin-top: 0; text-align: center;">{{event_title}}</h2>
            
            <!-- Ticket Number -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; border: 2px solid #667eea;">
                <div style="font-size: 18px; font-weight: bold; color: #333;">
                    🎫 Ticket #{{ticket_number}}
                </div>
            </div>
            
            <!-- Event Details -->
            <div style="margin: 20px 0; background: white; border: 1px solid #eee; border-radius: 8px; padding: 20px;">
                <h3 style="color: #667eea; margin-top: 0;">📅 Event Details</h3>
                
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <strong style="color: #333;">👤 Attendee:</strong>
                    <span style="float: right; color: #666;">{{to_name}}</span>
                    <div style="clear: both;"></div>
                </div>
                
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <strong style="color: #333;">📅 Date:</strong>
                    <span style="float: right; color: #666;">{{event_date}}</span>
                    <div style="clear: both;"></div>
                </div>
                
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <strong style="color: #333;">🕐 Time:</strong>
                    <span style="float: right; color: #666;">{{event_time}}</span>
                    <div style="clear: both;"></div>
                </div>
                
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <strong style="color: #333;">📍 Location:</strong>
                    <span style="float: right; color: #666;">{{event_location}}</span>
                    <div style="clear: both;"></div>
                </div>
                
                <div style="margin: 10px 0; padding: 8px 0;">
                    <strong style="color: #333;">⏰ Time Slot:</strong>
                    <span style="float: right; color: #666;">{{time_slot}}</span>
                    <div style="clear: both;"></div>
                </div>
            </div>
            
            <!-- QR Code Section -->
            <div style="text-align: center; margin: 30px 0; padding: 25px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 10px; border: 2px solid #667eea;">
                <h3 style="color: #333; margin-top: 0;">🔍 Verification QR Code</h3>
                <p style="color: #666; margin: 10px 0;">Show this QR code at the event entrance for verification</p>
                
                <div style="background: white; padding: 15px; border-radius: 8px; display: inline-block; margin: 15px 0;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={{verification_qr}}" 
                         alt="Verification QR Code" 
                         style="display: block; margin: 0 auto;">
                </div>
                
                <p style="font-size: 12px; color: #666; margin: 0; font-style: italic;">
                    ⚠️ This QR code is unique to your ticket and cannot be transferred
                </p>
            </div>
            
            <!-- Important Instructions -->
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="color: #856404; margin-top: 0;">📋 Important Instructions</h4>
                <ul style="color: #856404; margin: 0; padding-left: 20px;">
                    <li>Arrive 15 minutes before your scheduled time</li>
                    <li>Bring a valid ID for verification</li>
                    <li>Show this QR code at the entrance</li>
                    <li>Keep this email accessible on your mobile device</li>
                </ul>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 25px; color: #666; font-size: 12px; background: #f8f9fa; border-top: 1px solid #eee;">
            <p style="margin: 0 0 10px 0; font-weight: bold;">Thank you for registering!</p>
            <p style="margin: 0 0 10px 0;">For support or questions, please contact the event organizer.</p>
            <p style="margin: 0; font-style: italic;">Event Management System - Powered by Technology</p>
        </div>
    </div>
</body>
</html>
```

## 🚀 TESTING STEPS

### Step 1: Update EmailJS Configuration
1. **Service Settings**: Set "To Email" to `{{to_email}}`
2. **Template**: Replace with the corrected template above
3. **Save all changes**

### Step 2: Test Registration
1. **Register for an event** with a different email than your EmailJS account
2. **Check console logs** for recipient confirmation
3. **Check the user's email inbox** (not your EmailJS account)

### Step 3: Expected Results
- **Email goes to user's email** (not your account)
- **Professional template** with working placeholder image
- **QR code displays** correctly
- **All event details** properly formatted

## 🔍 TROUBLESHOOTING

### If email still goes to your account:
1. **Check EmailJS service "To Email" field**
2. **Ensure it's `{{to_email}}` not your fixed email**
3. **Save and test again**

### If image still doesn't show:
1. **The template now uses a working placeholder**
2. **For custom images, upload to external hosting**
3. **Update event creation to use external URLs**

**Follow these steps and the email should go to the user's email with a working image!** 🎉
