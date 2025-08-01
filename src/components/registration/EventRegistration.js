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
      console.log('📧 Sending ticket email...');
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

      const emailResult = await sendTicketEmail(ticketData);

      if (emailResult.success) {
        console.log('✅ Ticket email sent successfully');
        // Update registration to mark email as sent
        await updateDoc(registrationDoc, { ticketSent: true });
      } else {
        console.warn('⚠️ Email sending failed, but registration completed:', emailResult.error);
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
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-600 mb-4">Registration Successful!</h2>
          <p className="text-gray-600 mb-4">
            Thank you for registering for <strong>{event.title}</strong>!
          </p>
          <div className="bg-white rounded-lg p-4 shadow-md text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Event Details:</h3>
            <p className="text-sm text-gray-600">📅 {new Date(event.date).toLocaleDateString()}</p>
            <p className="text-sm text-gray-600">🕐 {event.time}</p>
            {event.location && <p className="text-sm text-gray-600">📍 {event.location}</p>}
            {formData.timeSlot && <p className="text-sm text-gray-600">⏰ {formData.timeSlot}</p>}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Please save this confirmation for your records.
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
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-32 object-cover"
            />
          )}
          <div className="p-4">
            <h1 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h1>
            <div className="space-y-1 text-sm text-gray-600">
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
          <h2 className="text-lg font-bold text-gray-900 mb-4">Register for Event</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your phone number"
              />
            </div>

            {event.timeSlots && event.timeSlots.length > 0 && (
              <div>
                <label htmlFor="timeSlot" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Time Slot *
                </label>
                <select
                  id="timeSlot"
                  name="timeSlot"
                  required
                  value={formData.timeSlot}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Choose a time slot</option>
                  {event.timeSlots.map((slot, index) => (
                    <option key={index} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Registering...' : 'Register Now'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          By registering, you agree to receive event-related communications.
        </p>
      </div>
    </div>
  );
};

export default EventRegistration;
