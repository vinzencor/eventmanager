import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { verifyTicketQR, sendCheckInConfirmationEmail } from '../../services/emailService';
import { collection, query, where, getDocs, updateDoc, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const Navbar = () => {
  const { currentUser, logout, userRole } = useAuth();
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [availableEvents, setAvailableEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const fetchAvailableEvents = async () => {
    setLoadingEvents(true);
    try {
      const eventsRef = collection(db, 'events');
      let eventsQuery;

      if (userRole === 'super_admin') {
        // Super admin can see all events
        eventsQuery = query(eventsRef, orderBy('date', 'desc'));
      } else {
        // Temp admin can only see their events
        eventsQuery = query(
          eventsRef,
          where('createdBy', '==', currentUser.uid),
          orderBy('date', 'desc')
        );
      }

      const snapshot = await getDocs(eventsQuery);
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter for recent/upcoming events
      const now = new Date();
      const recentEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        const daysDiff = (eventDate - now) / (1000 * 60 * 60 * 24);
        return daysDiff >= -1 && daysDiff <= 30; // Events from yesterday to next month
      });

      setAvailableEvents(recentEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const startCamera = async () => {
    try {
      setScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      alert('Camera access is required for QR scanning. Please enable camera permissions.');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const verifyTicket = async (qrData) => {
    if (!selectedEventId) {
      setScanResult({
        success: false,
        message: 'Please select an event first',
        type: 'NO_EVENT_SELECTED'
      });
      return;
    }

    try {
      console.log('🔍 Verifying ticket for event:', selectedEventId);
      
      const verification = await verifyTicketQR(qrData, selectedEventId);
      
      if (verification.valid) {
        // Check if ticket exists in database
        const registrationsRef = collection(db, 'registrations');
        const q = query(
          registrationsRef, 
          where('ticketNumber', '==', verification.ticketData.ticketNumber),
          where('eventId', '==', selectedEventId)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setScanResult({
            success: false,
            message: 'Ticket not found in database',
            type: 'NOT_FOUND'
          });
          return;
        }
        
        const ticketDoc = snapshot.docs[0];
        const ticketData = ticketDoc.data();
        
        if (ticketData.checkedIn) {
          setScanResult({
            success: false,
            message: `Already used at ${new Date(ticketData.checkedInAt.toDate()).toLocaleString()}`,
            type: 'ALREADY_USED',
            ticketData: ticketData
          });
          return;
        }
        
        // Mark as used with enhanced tracking
        const checkInData = {
          checkedIn: true,
          checkedInAt: new Date(),
          checkedInBy: currentUser?.email || 'admin',
          checkedInLocation: 'QR Scanner',
          verificationMethod: 'navbar_scanner'
        };

        await updateDoc(ticketDoc.ref, checkInData);

        // Get event details for confirmation email
        const eventDoc = await getDoc(doc(db, 'events', selectedEventId));
        const eventData = eventDoc.exists() ? eventDoc.data() : null;

        // Send confirmation email to ticket holder
        if (eventData && ticketData.email) {
          console.log('📧 Sending check-in confirmation email...');
          const emailResult = await sendCheckInConfirmationEmail(
            ticketData,
            eventData,
            currentUser?.email || 'admin'
          );

          if (emailResult.success) {
            console.log('✅ Confirmation email sent successfully');
          } else {
            console.warn('⚠️ Confirmation email failed:', emailResult.error);
          }
        }

        setScanResult({
          success: true,
          message: '✅ Valid ticket - Entry approved! Confirmation email sent.',
          type: 'APPROVED',
          ticketData: ticketData,
          emailSent: eventData && ticketData.email
        });
        
      } else {
        setScanResult({
          success: false,
          message: verification.message,
          type: verification.type
        });
      }
      
    } catch (error) {
      console.error('Verification error:', error);
      setScanResult({
        success: false,
        message: 'Verification failed: ' + error.message,
        type: 'ERROR'
      });
    }
  };

  const handleManualVerification = () => {
    if (manualInput.trim()) {
      verifyTicket(manualInput.trim());
      setManualInput('');
    }
  };

  const openScanner = () => {
    setShowScanner(true);
    fetchAvailableEvents();
  };

  const closeScanner = () => {
    stopCamera();
    setShowScanner(false);
    setScanResult(null);
    setManualInput('');
    setSelectedEventId('');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!currentUser || (!userRole || (userRole !== 'super_admin' && userRole !== 'temp_admin'))) {
    return null;
  }

  return (
    <>
      {/* Enhanced Responsive Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo/Brand - Improved */}
            <div className="flex items-center min-w-0">
              <Link to="/dashboard" className="flex-shrink-0 hover:opacity-80 transition-opacity">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-primary-600">
                  <span className="hidden xs:inline">Event Manager</span>
                  <span className="xs:hidden">EM</span>
                </h1>
              </Link>
            </div>

            {/* Right side - Enhanced responsive */}
            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
              {/* QR Scanner Button - Enhanced */}
              <button
                onClick={openScanner}
                className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium flex items-center space-x-1 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                title="Quick QR Scanner"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h.01M12 12v.01M12 21.02V21M4.01 12H4m0 0h.01M4 12v.01" />
                </svg>
                <span className="hidden sm:inline">📱 Scan</span>
                <span className="sm:hidden">📱</span>
              </button>

              {/* User Menu - Enhanced responsive */}
              <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3">
                <div className="hidden lg:block">
                  <span className="text-xs sm:text-sm text-gray-700 truncate max-w-24 lg:max-w-32">
                    {currentUser.email}
                  </span>
                </div>
                <span className="text-xs bg-primary-100 text-primary-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium">
                  {userRole === 'super_admin' ? 'Super' : 'Admin'}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-medium transition-colors"
                  title="Logout"
                >
                  <span className="sm:inline">Logout</span>
                  <span className="sm:hidden">⏻</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Enhanced Responsive QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start sm:items-center justify-center z-50 p-1 sm:p-4">
          <div className="bg-white rounded-lg sm:rounded-xl w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl max-h-[99vh] sm:max-h-[95vh] overflow-y-auto shadow-2xl mt-1 sm:mt-0">
            {/* Header - Enhanced Responsive */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 rounded-t-lg sm:rounded-t-xl">
              <div className="flex justify-between items-center">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 truncate">📱 QR Scanner</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Scan tickets for verification</p>
                </div>
                <button
                  onClick={closeScanner}
                  className="text-gray-400 hover:text-gray-600 active:text-gray-800 p-1.5 sm:p-2 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors flex-shrink-0 ml-2"
                  title="Close Scanner"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content - Responsive Padding */}
            <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

              {/* Responsive Event Selection */}
              <div className="space-y-3">
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  Select Event to Scan
                </label>
                {loadingEvents ? (
                  <div className="flex items-center justify-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-primary-600"></div>
                    <span className="ml-2 text-xs sm:text-sm text-gray-600">Loading events...</span>
                  </div>
                ) : availableEvents.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                      className="w-full px-3 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                    >
                      <option value="">Choose an event...</option>
                      {availableEvents.map(event => (
                        <option key={event.id} value={event.id}>
                          {event.title} - {new Date(event.date).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                    {selectedEventId && (
                      <div className="bg-primary-50 border border-primary-200 rounded-lg p-2 sm:p-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                          <span className="text-xs sm:text-sm text-primary-700 font-medium">
                            Event selected - Ready to scan
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 11-4 0 2 2 0 014 0zM8 11a4 4 0 118 0v4a4 4 0 11-8 0v-4z" />
                      </svg>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">No recent events found</p>
                    <p className="text-xs text-gray-400 mt-1">Create an event to start scanning tickets</p>
                  </div>
                )}
              </div>

              {/* Fully Responsive Camera Scanner */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-700">Camera Scanner</h4>
                  {scanning && (
                    <div className="flex items-center space-x-1 text-xs text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Live</span>
                    </div>
                  )}
                </div>

                {!scanning ? (
                  <div className="text-center space-y-3">
                    <div className="w-full h-32 xs:h-40 sm:h-48 md:h-56 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 relative overflow-hidden">
                      <div className="text-gray-400 text-center z-10">
                        <svg className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs sm:text-sm font-medium">Camera Preview</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedEventId ? 'Ready to scan' : 'Select event first'}
                        </p>
                      </div>
                      {/* Decorative camera frame */}
                      <div className="absolute inset-4 border border-gray-300 rounded-lg opacity-30"></div>
                    </div>

                    <button
                      onClick={startCamera}
                      disabled={!selectedEventId}
                      className={`w-full py-2.5 sm:py-3 px-4 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                        selectedEventId
                          ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg transform hover:scale-[1.02]'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {selectedEventId ? '📷 Start Camera' : '⚠️ Select Event First'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <div className="relative">
                      <video
                        ref={videoRef}
                        className="w-full h-32 xs:h-40 sm:h-48 md:h-56 bg-black rounded-xl object-cover shadow-lg"
                        autoPlay
                        playsInline
                      />
                      {/* Enhanced scanning overlay */}
                      <div className="absolute inset-0 rounded-xl pointer-events-none">
                        {/* Corner brackets */}
                        <div className="absolute top-3 left-3 w-4 h-4 sm:w-6 sm:h-6 border-t-2 border-l-2 border-purple-400"></div>
                        <div className="absolute top-3 right-3 w-4 h-4 sm:w-6 sm:h-6 border-t-2 border-r-2 border-purple-400"></div>
                        <div className="absolute bottom-3 left-3 w-4 h-4 sm:w-6 sm:h-6 border-b-2 border-l-2 border-purple-400"></div>
                        <div className="absolute bottom-3 right-3 w-4 h-4 sm:w-6 sm:h-6 border-b-2 border-r-2 border-purple-400"></div>

                        {/* Center scanning line */}
                        <div className="absolute inset-x-4 top-1/2 h-0.5 bg-purple-400 opacity-60 animate-pulse"></div>

                        {/* Scanning instruction */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                          Point at QR code
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={stopCamera}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 sm:py-3 px-4 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        ⏹️ Stop Camera
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Responsive Manual Input */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-xs sm:text-sm text-gray-500 font-medium">OR</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Enter QR Code Manually
                  </label>
                  <div className="space-y-2 sm:space-y-0 sm:flex sm:space-x-2">
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="Paste QR code data here..."
                      className="w-full sm:flex-1 px-3 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && manualInput.trim() && selectedEventId) {
                          handleManualVerification();
                        }
                      }}
                    />
                    <button
                      onClick={handleManualVerification}
                      disabled={!manualInput.trim() || !selectedEventId}
                      className={`w-full sm:w-auto px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                        manualInput.trim() && selectedEventId
                          ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <span className="sm:hidden">🔍 Verify QR Code</span>
                      <span className="hidden sm:inline">Verify</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Tip: You can also paste QR data and press Enter
                  </p>
                </div>
              </div>

              {/* Fully Responsive Scan Result */}
              {scanResult && (
                <div className={`rounded-xl border-2 transition-all duration-500 transform ${
                  scanResult.success
                    ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300 shadow-green-200'
                    : 'bg-gradient-to-br from-red-50 to-red-100 border-red-300 shadow-red-200'
                } shadow-lg hover:shadow-xl`}>
                  {/* Result Header */}
                  <div className={`px-3 sm:px-4 py-3 rounded-t-xl ${
                    scanResult.success ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <div className="text-white text-lg sm:text-xl">
                        {scanResult.success ? '✅' : '❌'}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold text-xs sm:text-sm">
                          {scanResult.success ? 'TICKET APPROVED' : 'TICKET REJECTED'}
                        </p>
                        <p className="text-white text-xs opacity-90">
                          {new Date().toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Result Content */}
                  <div className="p-3 sm:p-4 space-y-3">
                    <p className={`font-medium text-xs sm:text-sm ${
                      scanResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {scanResult.message}
                    </p>

                    {scanResult.ticketData && (
                      <div className="space-y-3">
                        {/* Ticket Information Card */}
                        <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                          <h5 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                            </svg>
                            Ticket Details
                          </h5>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex justify-between items-center py-1 border-b border-gray-100">
                              <span className="text-xs text-gray-600">Name:</span>
                              <span className="text-xs sm:text-sm font-medium text-gray-900 truncate ml-2">
                                {scanResult.ticketData.name}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-gray-100">
                              <span className="text-xs text-gray-600">Ticket #:</span>
                              <span className="text-xs font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                {scanResult.ticketData.ticketNumber}
                              </span>
                            </div>
                            {scanResult.ticketData.email && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-xs text-gray-600">Email:</span>
                                <span className="text-xs text-gray-900 truncate ml-2">
                                  {scanResult.ticketData.email}
                                </span>
                              </div>
                            )}
                            {scanResult.ticketData.timeSlot && (
                              <div className="flex justify-between items-center py-1">
                                <span className="text-xs text-gray-600">Time Slot:</span>
                                <span className="text-xs sm:text-sm font-medium text-gray-900">
                                  {scanResult.ticketData.timeSlot}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Indicators */}
                        <div className="flex flex-wrap gap-2">
                          {scanResult.success && (
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                              scanResult.emailSent
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                scanResult.emailSent ? 'bg-green-500' : 'bg-yellow-500'
                              }`}></div>
                              <span>
                                {scanResult.emailSent ? '📧 Email sent' : '⚠️ No email'}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            <span>📱 Navbar scan</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
