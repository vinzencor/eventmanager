import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, collection, addDoc, updateDoc, increment, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { generateTicketNumber, generateVerificationQRData, sendTicketEmail } from '../../services/emailService';

const EventRegistration = () => {
  const { qrCode } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    timeSlot: ''
  });

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        console.log('🔍 Fetching event with QR code:', qrCode);

        // Find event by QR code
        const eventsRef = collection(db, 'events');
        const snapshot = await getDocs(query(eventsRef, where('qrCode', '==', qrCode)));

        console.log('📊 Query result:', snapshot.size, 'documents found');

        if (!snapshot.empty) {
          const eventDoc = snapshot.docs[0];
          const eventData = { id: eventDoc.id, ...eventDoc.data() };
          console.log('✅ Event found:', eventData.title);
          setEvent(eventData);

          // Set default time slot if only one available
          if (eventData.timeSlots && eventData.timeSlots.length === 1) {
            setFormData(prev => ({ ...prev, timeSlot: eventData.timeSlots[0] }));
          }
        } else {
          console.log('❌ No event found with QR code:', qrCode);
          setError('Event not found or QR code is invalid');
        }
      } catch (error) {
        console.error('🚨 Error fetching event:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        setError('Failed to load event: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [qrCode]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!event) return;
    
    // Check if event is sold out
    if (event.availableTickets <= 0) {
      setError('Sorry, this event is sold out!');
      return;
    }

    try {
      setError('');
      setSubmitting(true);

      console.log('🎫 Starting registration process...');

      // Validate form
      if (!formData.name || !formData.email || !formData.phone) {
        setError('Please fill in all required fields');
        return;
      }

      if (event.timeSlots && event.timeSlots.length > 0 && !formData.timeSlot) {
        setError('Please select a time slot');
        return;
      }

      console.log('✅ Form validation passed');

      // Generate ticket number and verification QR
      const ticketNumber = generateTicketNumber();
      const verificationQR = generateVerificationQRData(ticketNumber, event.id, formData.email);

      console.log('🎫 Generated ticket number:', ticketNumber);

      // Create registration document with ticket info
      const registrationData = {
        eventId: event.id,
        eventTitle: event.title,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        timeSlot: formData.timeSlot || null,
        registeredAt: new Date(),
        qrCode: qrCode,
        ticketNumber: ticketNumber,
        verificationQR: verificationQR,
        ticketSent: false
      };

      console.log('📝 Creating registration document...');
      const registrationDoc = await addDoc(collection(db, 'registrations'), registrationData);
      console.log('✅ Registration document created');

      // Update event ticket counts
      console.log('🔄 Updating ticket counts...');
      await updateDoc(doc(db, 'events', event.id), {
        registrations: increment(1),
        availableTickets: increment(-1)
      });
      console.log('✅ Ticket counts updated');

      // Send ticket email
      console.log('📧 Preparing to send ticket email...');
      console.log('📧 Event data:', event);
      console.log('📧 Form data:', formData);

      const ticketData = {
        userEmail: formData.email,
        userName: formData.name,
        eventTitle: event.title,
        eventDate: new Date(event.date).toLocaleDateString(),
        eventTime: event.time,
        eventLocation: event.location,
        ticketNumber: ticketNumber,
        timeSlot: formData.timeSlot,
        verificationQR: verificationQR,
        eventImage: event.imageUrl
      };

      console.log('📧 About to call sendTicketEmail...');
      console.log('📧 sendTicketEmail function type:', typeof sendTicketEmail);
      console.log('📧 Calling sendTicketEmail with data:', ticketData);

      let emailResult;
      try {
        emailResult = await sendTicketEmail(ticketData);
        console.log('📧 Email result received:', emailResult);
      } catch (emailError) {
        console.error('❌ Exception in sendTicketEmail call:', emailError);
        emailResult = {
          success: false,
          error: emailError?.message || emailError?.toString() || 'Email function call failed'
        };
      }

      if (emailResult && emailResult.success) {
        console.log('✅ Ticket email sent successfully');
        // Update registration to mark email as sent
        try {
          await updateDoc(registrationDoc, { ticketSent: true });
        } catch (updateError) {
          console.warn('⚠️ Failed to update ticketSent status:', updateError);
        }
      } else {
        const errorMessage = emailResult?.error || 'Unknown email error';
        console.error('❌ Email sending failed:', errorMessage);
        // Show user-friendly error message
        alert(`Registration successful, but email failed to send: ${errorMessage}. Please contact support with your ticket number: ${ticketNumber}`);
      }

      console.log('🎉 Registration completed successfully!');
      setSuccess(true);

    } catch (error) {
      console.error('🚨 Registration failed:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      setError('Failed to register: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">�</div>
          <h2 className="text-2xl font-heading text-green-600 mb-4">You're In! 🚀</h2>
          <p className="text-gray-600 mb-4">
            Awesome! You've secured your spot for <strong>{event.title}</strong>!
          </p>
          <div className="bg-white rounded-lg p-4 shadow-md text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Event Details:</h3>
            <p className="text-sm text-gray-600">📅 {new Date(event.date).toLocaleDateString()}</p>
            <p className="text-sm text-gray-600">🕐 {event.time}</p>
            {event.location && <p className="text-sm text-gray-600">📍 {event.location}</p>}
            {formData.timeSlot && <p className="text-sm text-gray-600">⏰ {formData.timeSlot}</p>}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            🎫 Your digital ticket is on its way! Check your email for the magic ✨
          </p>
        </div>
      </div>
    );
  }

  // Check if sold out
  if (event.availableTickets <= 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎫</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Tickets Sold Out</h2>
          <p className="text-gray-600 mb-4">
            Sorry, <strong>{event.title}</strong> is completely sold out.
          </p>
          <div className="bg-white rounded-lg p-4 shadow-md">
            <h3 className="font-semibold text-gray-900 mb-2">Event Details:</h3>
            <p className="text-sm text-gray-600">📅 {new Date(event.date).toLocaleDateString()}</p>
            <p className="text-sm text-gray-600">🕐 {event.time}</p>
            {event.location && <p className="text-sm text-gray-600">📍 {event.location}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Event Header */}
        <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
          {event.imageUrl && (
            <div className="w-full">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-auto object-contain max-h-64"
              />
            </div>
          )}
          <div className="p-4">
            <h1 className="text-xl font-heading text-gray-900 mb-2">{event.title}</h1>
            <div className="space-y-1 text-sm font-body text-gray-600">
              <p>📅 {new Date(event.date).toLocaleDateString()}</p>
              <p>🕐 {event.time}</p>
              {event.location && <p>📍 {event.location}</p>}
              <p className="text-primary-600 font-medium">
                🎫 {event.availableTickets} tickets remaining
              </p>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-heading text-gray-900 mb-2">🎉 Secure Your Spot!</h2>
          <p className="text-gray-600 text-sm font-body mb-6">Join the excitement - your adventure awaits!</p>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <label htmlFor="name" className="block text-sm font-display text-gray-800 mb-2">
                👤 What should we call you? *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-all duration-200 placeholder-gray-400"
                placeholder="Your awesome name here..."
              />
            </div>

            <div className="relative">
              <label htmlFor="email" className="block text-sm font-display text-gray-800 mb-2">
                📧 Where can we reach you? *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-all duration-200 placeholder-gray-400"
                placeholder="your.email@awesome.com"
              />
            </div>

            <div className="relative">
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-800 mb-2">
                📱 Your hotline number *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-all duration-200 placeholder-gray-400"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {event.timeSlots && event.timeSlots.length > 0 && (
              <div className="relative">
                <label htmlFor="timeSlot" className="block text-sm font-display text-gray-800 mb-2">
                  ⏰ Pick your perfect time *
                </label>
                <select
                  id="timeSlot"
                  name="timeSlot"
                  required
                  value={formData.timeSlot}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-all duration-200 appearance-none cursor-pointer"
                >
                  <option value="">When works best for you?</option>
                  {event.timeSlots.map((slot, index) => (
                    <option key={index} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none mt-8">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-button py-4 px-6 rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all duration-200"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ✨ Securing your spot...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  🚀 Let's Go! Register Now
                </div>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          🎉 By joining, you'll get exclusive event updates & surprises!
        </p>
      </div>
    </div>
  );
};

export default EventRegistration;
