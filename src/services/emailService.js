import emailjs from '@emailjs/browser';

// EmailJS Configuration
// You'll need to set up EmailJS account and get these values
const EMAIL_CONFIG = {
  serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID || 'service_default',
  templateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'template_default',
  publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || 'your_public_key'
};

// Initialize EmailJS
emailjs.init(EMAIL_CONFIG.publicKey);

// Generate unique ticket number
export const generateTicketNumber = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `TKT-${timestamp}-${random}`.toUpperCase();
};

// Generate verification QR code data
export const generateVerificationQRData = (ticketNumber, eventId, userEmail) => {
  const verificationData = {
    ticketNumber,
    eventId,
    userEmail,
    timestamp: Date.now(),
    type: 'TICKET_VERIFICATION'
  };
  
  // Encode as base64 for QR code
  return btoa(JSON.stringify(verificationData));
};

// Send ticket email to user
export const sendTicketEmail = async (ticketData) => {
  try {
    console.log('📧 Sending ticket email to:', ticketData.userEmail);
    
    const emailParams = {
      to_email: ticketData.userEmail,
      to_name: ticketData.userName,
      event_title: ticketData.eventTitle,
      event_date: ticketData.eventDate,
      event_time: ticketData.eventTime,
      event_location: ticketData.eventLocation || 'TBA',
      ticket_number: ticketData.ticketNumber,
      time_slot: ticketData.timeSlot || 'General Admission',
      verification_qr: ticketData.verificationQR,
      event_image: ticketData.eventImage || ''
    };

    const result = await emailjs.send(
      EMAIL_CONFIG.serviceId,
      EMAIL_CONFIG.templateId,
      emailParams
    );

    console.log('✅ Email sent successfully:', result);
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Verify ticket QR code
export const verifyTicketQR = async (qrData, eventId) => {
  try {
    console.log('🔍 Verifying ticket QR code...');
    
    // Decode QR data
    const decodedData = JSON.parse(atob(qrData));
    
    // Validate QR code structure
    if (decodedData.type !== 'TICKET_VERIFICATION') {
      return { 
        valid: false, 
        message: 'Invalid QR code format',
        type: 'INVALID_FORMAT'
      };
    }
    
    // Check if QR is for the correct event
    if (decodedData.eventId !== eventId) {
      return { 
        valid: false, 
        message: 'QR code is for a different event',
        type: 'WRONG_EVENT'
      };
    }
    
    // Check if QR is not too old (24 hours validity)
    const qrAge = Date.now() - decodedData.timestamp;
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
      ticketData: decodedData,
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
