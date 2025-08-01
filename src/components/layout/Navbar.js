import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { verifyTicketQR } from '../../services/emailService';
import { collection, query, where, getDocs, updateDoc, orderBy } from 'firebase/firestore';
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
        
        // Mark as used
        await updateDoc(ticketDoc.ref, {
          checkedIn: true,
          checkedInAt: new Date(),
          checkedInBy: currentUser?.email || 'admin'
        });
        
        setScanResult({
          success: true,
          message: 'Valid ticket - Entry approved',
          type: 'APPROVED',
          ticketData: ticketData
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
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/admin/dashboard" className="flex-shrink-0">
                <h1 className="text-xl font-bold text-primary-600">Event Manager</h1>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {/* QR Scanner Button */}
              <button
                onClick={openScanner}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
                title="Quick QR Scanner"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h.01M12 12v.01M12 21.02V21M4.01 12H4m0 0h.01M4 12v.01" />
                </svg>
                <span>📱 Scan QR</span>
              </button>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700">
                  {currentUser.email}
                </span>
                <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                  {userRole === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">📱 Quick QR Scanner</h3>
              <button
                onClick={closeScanner}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Event Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Event to Scan
              </label>
              {loadingEvents ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading events...</span>
                </div>
              ) : availableEvents.length > 0 ? (
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Choose an event...</option>
                  {availableEvents.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.title} - {new Date(event.date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">No recent events found</p>
                  <p className="text-xs mt-1">Create an event to start scanning tickets</p>
                </div>
              )}
            </div>

            {/* Camera Scanner */}
            <div className="mb-4">
              {!scanning ? (
                <div className="text-center">
                  <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                    <div className="text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm">Camera Preview</p>
                    </div>
                  </div>
                  <button
                    onClick={startCamera}
                    disabled={!selectedEventId}
                    className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    📷 Start Camera
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <video
                    ref={videoRef}
                    className="w-full h-48 bg-black rounded-lg mb-3"
                    autoPlay
                    playsInline
                  />
                  <button
                    onClick={stopCamera}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                  >
                    ⏹️ Stop Camera
                  </button>
                </div>
              )}
            </div>

            {/* Manual Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Enter QR Code Manually
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Paste QR code data"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={handleManualVerification}
                  disabled={!manualInput.trim() || !selectedEventId}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Verify
                </button>
              </div>
            </div>

            {/* Scan Result */}
            {scanResult && (
              <div className={`p-4 rounded-lg ${
                scanResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center">
                  <div className={`text-2xl mr-3 ${
                    scanResult.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {scanResult.success ? '✅' : '❌'}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${
                      scanResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {scanResult.message}
                    </p>
                    {scanResult.ticketData && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p><strong>Name:</strong> {scanResult.ticketData.name}</p>
                        <p><strong>Ticket:</strong> {scanResult.ticketData.ticketNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
