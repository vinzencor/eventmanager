import emailjs from '@emailjs/browser';

console.log('📧 EmailJS imported:', typeof emailjs);
console.log('📧 Environment variables:', {
  serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID,
  templateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
  publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY ? 'SET' : 'NOT_SET'
});

// EmailJS Configuration
// You'll need to set up EmailJS account and get these values
const EMAIL_CONFIG = {
  serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID || 'service_default',
  templateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'template_default',
  publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || 'your_public_key'
};

console.log('📧 EMAIL_CONFIG created:', EMAIL_CONFIG);

// Initialize EmailJS
console.log('🔧 Initializing EmailJS with config:', {
  serviceId: EMAIL_CONFIG.serviceId,
  templateId: EMAIL_CONFIG.templateId,
  publicKey: EMAIL_CONFIG.publicKey ? EMAIL_CONFIG.publicKey.substring(0, 10) + '...' : 'NOT_SET'
});

emailjs.init(EMAIL_CONFIG.publicKey);

// Test EmailJS configuration
export const testEmailJS = async () => {
  try {
    console.log('🧪 Testing EmailJS configuration...');
    const testParams = {
      to_email: 'test@example.com',
      to_name: 'Test User',
      event_title: 'Test Event',
      event_date: '2024-01-01',
      event_time: '10:00 AM',
      ticket_number: 'TEST-123',
      verification_qr: 'test-qr-data'
    };

    const result = await emailjs.send(
      EMAIL_CONFIG.serviceId,
      EMAIL_CONFIG.templateId,
      testParams
    );

    console.log('✅ EmailJS test successful:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ EmailJS test failed:', error);
    return { success: false, error: error.message };
  }
};

// Generate unique ticket number
export const generateTicketNumber = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `TKT-${timestamp}-${random}`.toUpperCase();
};

// Generate verification QR code data (optimized for size)
export const generateVerificationQRData = (ticketNumber, eventId, userEmail) => {
  const verificationData = {
    t: ticketNumber,        // shortened key
    e: eventId,            // shortened key
    u: userEmail,          // shortened key
    ts: Date.now(),        // shortened key
    type: 'TKT'           // shortened value
  };

  // Encode as base64 for QR code
  const qrData = btoa(JSON.stringify(verificationData));
  console.log('📧 QR data size:', qrData.length, 'characters');
  return qrData;
};

// Send ticket email to user
export const sendTicketEmail = async (ticketData) => {
  console.log('📧 sendTicketEmail function called');
  console.log('📧 Function parameters received:', ticketData);

  try {
    console.log('📧 Starting email send process...');

    // Check if emailjs is available
    if (typeof emailjs === 'undefined') {
      throw new Error('EmailJS library not loaded');
    }

    console.log('📧 EmailJS Config:', {
      serviceId: EMAIL_CONFIG.serviceId,
      templateId: EMAIL_CONFIG.templateId,
      publicKey: EMAIL_CONFIG.publicKey ? EMAIL_CONFIG.publicKey.substring(0, 10) + '...' : 'NOT_SET'
    });

    // Validate input data
    if (!ticketData || !ticketData.userEmail) {
      throw new Error('Invalid ticket data: missing email');
    }

    console.log('📧 Sending ticket email to:', ticketData.userEmail);

    // Validate EmailJS configuration
    if (!EMAIL_CONFIG.serviceId || EMAIL_CONFIG.serviceId === 'service_default' ||
        !EMAIL_CONFIG.templateId || EMAIL_CONFIG.templateId === 'template_default' ||
        !EMAIL_CONFIG.publicKey || EMAIL_CONFIG.publicKey === 'your_public_key') {
      throw new Error('EmailJS configuration not properly set. Please check your .env.local file.');
    }

    // Check if event image is base64 and too large
    let eventImageUrl = ticketData.eventImage || '';
    if (eventImageUrl.startsWith('data:image/')) {
      console.log('📧 Base64 image detected, size:', eventImageUrl.length, 'characters');
      if (eventImageUrl.length > 10000) { // ~10KB limit for base64
        console.log('📧 Image too large for email, using placeholder');
        eventImageUrl = 'https://via.placeholder.com/400x200/667eea/ffffff?text=Event+Image';
      }
    }

    const emailParams = {
      to_email: ticketData.userEmail,
      to_name: ticketData.userName || 'Guest',
      user_email: ticketData.userEmail, // Alternative parameter name
      event_title: ticketData.eventTitle || 'Event',
      event_date: ticketData.eventDate || 'TBA',
      event_time: ticketData.eventTime || 'TBA',
      event_location: ticketData.eventLocation || 'TBA',
      ticket_number: ticketData.ticketNumber || 'N/A',
      time_slot: ticketData.timeSlot || 'General Admission',
      verification_qr: encodeURIComponent(ticketData.verificationQR || ''),
      event_image: eventImageUrl || 'https://via.placeholder.com/400x200/667eea/ffffff?text=Event+Image'
    };

    console.log('📧 Email will be sent to:', ticketData.userEmail);
    console.log('📧 Email parameters (recipient check):', {
      to_email: emailParams.to_email,
      user_email: emailParams.user_email,
      to_name: emailParams.to_name
    });

    // Calculate approximate size
    const paramsSize = JSON.stringify(emailParams).length;
    console.log('📧 Email parameters size:', paramsSize, 'characters (~' + Math.round(paramsSize/1024) + 'KB)');

    console.log('📧 Email parameters prepared:', emailParams);

    console.log('📧 Calling emailjs.send...');
    const result = await emailjs.send(
      EMAIL_CONFIG.serviceId,
      EMAIL_CONFIG.templateId,
      emailParams
    );

    console.log('✅ Email sent successfully:', result);
    return { success: true, result };

  } catch (error) {
    console.error('❌ Email sending failed in sendTicketEmail:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error message:', error?.message || 'Unknown error');
    console.error('❌ Error details:', {
      message: error?.message || 'No message',
      status: error?.status || 'No status',
      text: error?.text || 'No text',
      stack: error?.stack || 'No stack'
    });

    return {
      success: false,
      error: error?.message || error?.toString() || 'Unknown email error'
    };
  }
};

// Verify ticket QR code
export const verifyTicketQR = async (qrData, eventId) => {
  try {
    console.log('🔍 Verifying ticket QR code...');

    // Decode QR data
    const decodedData = JSON.parse(atob(qrData));

    // Handle both old and new format
    const ticketData = {
      ticketNumber: decodedData.t || decodedData.ticketNumber,
      eventId: decodedData.e || decodedData.eventId,
      userEmail: decodedData.u || decodedData.userEmail,
      timestamp: decodedData.ts || decodedData.timestamp,
      type: decodedData.type
    };

    // Validate QR code structure
    if (ticketData.type !== 'TKT' && ticketData.type !== 'TICKET_VERIFICATION') {
      return {
        valid: false,
        message: 'Invalid QR code format',
        type: 'INVALID_FORMAT'
      };
    }

    // Check if QR is for the correct event
    if (ticketData.eventId !== eventId) {
      return {
        valid: false,
        message: 'QR code is for a different event',
        type: 'WRONG_EVENT'
      };
    }

    // Check if QR is not too old (24 hours validity)
    const qrAge = Date.now() - ticketData.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (qrAge > maxAge) {
      return {
        valid: false,
        message: 'QR code has expired',
        type: 'EXPIRED'
      };
    }

    // TODO: Check against database to ensure ticket wasn't already used
    // This would require additional database queries

    console.log('✅ QR code verified successfully');
    return {
      valid: true,
      message: 'Valid ticket',
      ticketData: ticketData,
      type: 'VALID'
    };

  } catch (error) {
    console.error('❌ QR verification failed:', error);
    return {
      valid: false,
      message: 'Invalid QR code data',
      type: 'DECODE_ERROR'
    };
  }
};

// Create ticket HTML template for email
export const createTicketHTML = (ticketData) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Event Ticket</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .ticket { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .event-image { width: 100%; height: 200px; object-fit: cover; }
        .content { padding: 30px; }
        .ticket-number { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold; }
        .details { margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .qr-section { text-align: center; margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="header">
          <h1>🎫 Event Ticket</h1>
          <p>Your admission pass</p>
        </div>
        
        ${ticketData.eventImage ? `<img src="${ticketData.eventImage}" alt="Event" class="event-image">` : ''}
        
        <div class="content">
          <h2>${ticketData.eventTitle}</h2>
          
          <div class="ticket-number">
            Ticket #${ticketData.ticketNumber}
          </div>
          
          <div class="details">
            <div class="detail-row">
              <strong>Attendee:</strong>
              <span>${ticketData.userName}</span>
            </div>
            <div class="detail-row">
              <strong>Date:</strong>
              <span>${ticketData.eventDate}</span>
            </div>
            <div class="detail-row">
              <strong>Time:</strong>
              <span>${ticketData.eventTime}</span>
            </div>
            ${ticketData.eventLocation ? `
            <div class="detail-row">
              <strong>Location:</strong>
              <span>${ticketData.eventLocation}</span>
            </div>` : ''}
            ${ticketData.timeSlot ? `
            <div class="detail-row">
              <strong>Time Slot:</strong>
              <span>${ticketData.timeSlot}</span>
            </div>` : ''}
          </div>
          
          <div class="qr-section">
            <h3>🔍 Verification QR Code</h3>
            <p>Show this QR code at the event entrance</p>
            <div style="margin: 20px 0;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticketData.verificationQR)}" alt="Verification QR Code" style="border: 2px solid #ddd; border-radius: 5px;">
            </div>
            <p style="font-size: 12px; color: #666;">This QR code is unique to your ticket</p>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for registering! Please arrive 15 minutes before your scheduled time.</p>
          <p>For support, contact the event organizer.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send check-in confirmation email to user
export const sendCheckInConfirmationEmail = async (ticketData, eventData, adminEmail) => {
  try {
    console.log('📧 Sending check-in confirmation email to:', ticketData.email);

    // Validate EmailJS configuration
    if (EMAIL_CONFIG.serviceId === 'service_default' ||
        EMAIL_CONFIG.templateId === 'template_default' ||
        EMAIL_CONFIG.publicKey === 'your_public_key') {
      console.warn('EmailJS not configured, skipping confirmation email');
      return { success: false, error: 'EmailJS not configured' };
    }

    const emailParams = {
      to_email: ticketData.email,
      to_name: ticketData.name,
      event_title: eventData.title,
      event_date: new Date(eventData.date).toLocaleDateString(),
      event_time: eventData.time,
      event_location: eventData.location || 'TBA',
      ticket_number: ticketData.ticketNumber,
      check_in_time: new Date().toLocaleString(),
      admin_email: adminEmail,
      confirmation_message: '✅ Your ticket has been successfully verified and you are checked in!'
    };

    console.log('📧 Sending check-in confirmation...');

    // Use the same template but with different content
    const result = await emailjs.send(
      EMAIL_CONFIG.serviceId,
      EMAIL_CONFIG.templateId, // Use existing template
      emailParams
    );

    console.log('✅ Check-in confirmation email sent successfully:', result);
    return { success: true, result };

  } catch (error) {
    console.error('❌ Check-in confirmation email failed:', error);
    return { success: false, error: error.message };
  }
};
