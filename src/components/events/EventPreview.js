import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import QRCode from 'react-qr-code';
import { useAuth } from '../../contexts/AuthContext';
import { useRealTimeRegistrations } from '../../hooks/useRealTimeTickets';

const EventPreview = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { registrations, loading: registrationsLoading } = useRealTimeRegistrations(eventId);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          setEvent({ id: eventDoc.id, ...eventDoc.data() });
        } else {
          setError('Event not found');
        }
      } catch (error) {
        setError('Failed to load event: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const getRegistrationUrl = () => {
    // Priority order for base URL:
    // 1. Environment variable (if set)
    // 2. Current window origin (default)
    const baseUrl = process.env.REACT_APP_REGISTRATION_URL || window.location.origin;

    const registrationUrl = `${baseUrl}/register/${event.qrCode}`;
    console.log('Generated registration URL:', registrationUrl);

    return registrationUrl;
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-code');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${event.title}-qr-code.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
          <Link to="/admin/dashboard" className="mt-4 inline-block bg-primary-600 text-white px-4 py-2 rounded">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link to="/admin/dashboard" className="text-primary-600 hover:text-primary-800 mb-4 inline-flex items-center text-sm sm:text-base font-medium transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Event Preview & QR Code</h1>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Event Preview */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden order-2 xl:order-1">
            <div className="relative">
              {event.imageUrl ? (
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-48 sm:h-56 lg:h-64 object-cover"
                />
              ) : (
                <div className="w-full h-48 sm:h-56 lg:h-64 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center">
                  <span className="text-white text-4xl sm:text-5xl lg:text-6xl font-bold drop-shadow-lg">{event.title.charAt(0)}</span>
                </div>
              )}
              <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium shadow-lg ${
                  event.availableTickets === 0
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-green-100 text-green-800 border border-green-200'
                }`}>
                  {event.availableTickets === 0 ? 'Sold Out' : `${event.availableTickets} Available`}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">{event.title}</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(event.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                
                <div className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {event.time}
                </div>
                
                {event.location && (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.location}
                  </div>
                )}
              </div>

              {event.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 leading-relaxed">{event.description}</p>
                </div>
              )}

              {event.timeSlots && event.timeSlots.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Available Time Slots</h3>
                  <div className="space-y-2">
                    {event.timeSlots.map((slot, index) => (
                      <div key={index} className="bg-gray-50 px-3 py-2 rounded-md text-sm text-gray-700">
                        {slot}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-500">Tickets</span>
                    <div className="text-lg font-semibold text-gray-900">
                      {event.registrations || 0} / {event.ticketCount} registered
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">Available</span>
                    <div className="text-lg font-semibold text-primary-600">
                      {event.availableTickets}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 order-1 xl:order-2">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center xl:text-left">Registration QR Code</h2>

            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-block p-3 sm:p-4 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
                <QRCode
                  id="qr-code"
                  value={getRegistrationUrl()}
                  size={200}
                  level="H"
                  className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-50 lg:h-50"
                />
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">Scan to register for this event</p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration URL
                </label>
                <div className="flex flex-col sm:flex-row">
                  <input
                    type="text"
                    value={getRegistrationUrl()}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-t-md sm:rounded-l-md sm:rounded-t-md bg-gray-50 text-xs sm:text-sm"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(getRegistrationUrl())}
                    className="px-4 py-2 bg-primary-600 text-white rounded-b-md sm:rounded-r-md sm:rounded-b-md hover:bg-primary-700 text-sm font-medium transition-colors"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={downloadQR}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                >
                  <span>📥</span>
                  <span>Download QR</span>
                </button>
                <button
                  onClick={() => navigate(`/admin/events/${eventId}/scan`)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                >
                  <span>📱</span>
                  <span>Scan Tickets</span>
                </button>
                <a
                  href={getRegistrationUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
                >
                  🔗 Test Registration
                </a>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h3 className="text-sm font-medium text-blue-900 mb-2">How to use:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Share the QR code or URL with attendees</li>
                <li>• Users can scan the QR code to register</li>
                <li>• Registration form is mobile-optimized</li>
                <li>• Ticket count updates in real-time</li>
              </ul>
            </div>
          </div>

          {/* Registered Users Section - Only visible to admins */}
          {(userRole === 'super_admin' || userRole === 'temp_admin') && (
            <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 order-3 xl:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Registered Users ({registrations.length})
                </h2>
                {registrationsLoading && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                )}
              </div>

              {registrations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No registrations yet</p>
                  <p className="text-gray-400 text-xs mt-1">Users will appear here when they register</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {registrations.map((registration, index) => (
                    <div key={registration.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">{index + 1}</span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {registration.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {registration.email}
                          </div>
                          {registration.phone && (
                            <div className="text-xs text-gray-400">
                              {registration.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        {registration.timeSlot && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {registration.timeSlot}
                          </span>
                        )}
                        <div className="text-xs text-gray-400">
                          {new Date(registration.registeredAt.toDate()).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          #{registration.ticketNumber}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {registrations.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 rounded-md">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">
                        <strong>{registrations.length}</strong> user{registrations.length !== 1 ? 's' : ''} registered for this event
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventPreview;
