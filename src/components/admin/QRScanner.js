import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { verifyTicketQR, sendCheckInConfirmationEmail } from '../../services/emailService';
import { useAuth } from '../../contexts/AuthContext';
import jsQR from 'jsqr';

const QRScanner = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [event, setEvent] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ approved: 0, rejected: 0, total: 0 });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        setEvent({ id: eventDoc.id, ...eventDoc.data() });
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      
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
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  // QR Code scanning logic
  const scanQRCode = () => {
    if (videoRef.current && canvasRef.current && scanning) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          console.log('QR Code detected:', code.data);
          stopCamera();
          verifyTicket(code.data);
        }
      }
    }
  };

  // Start scanning loop when camera starts
  useEffect(() => {
    let scanInterval;
    if (scanning && videoRef.current) {
      scanInterval = setInterval(scanQRCode, 100); // Scan every 100ms
    }
    return () => {
      if (scanInterval) {
        clearInterval(scanInterval);
      }
    };
  }, [scanning]);

  const verifyTicket = async (qrData) => {
    try {
      console.log('🔍 Verifying ticket:', qrData);
      
      // Verify QR code format and authenticity
      const verification = await verifyTicketQR(qrData, eventId);
      
      if (verification.valid) {
        // Check if ticket was already used
        const registrationsRef = collection(db, 'registrations');
        const q = query(
          registrationsRef, 
          where('ticketNumber', '==', verification.ticketData.ticketNumber),
          where('eventId', '==', eventId)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setScanResult({
            success: false,
            message: 'Ticket not found in database',
            type: 'NOT_FOUND',
            timestamp: new Date()
          });
          return;
        }
        
        const ticketDoc = snapshot.docs[0];
        const ticketData = ticketDoc.data();
        
        // Check if already checked in
        if (ticketData.checkedIn) {
          setScanResult({
            success: false,
            message: `Ticket already used at ${new Date(ticketData.checkedInAt.toDate()).toLocaleString()}`,
            type: 'ALREADY_USED',
            ticketData: ticketData,
            timestamp: new Date()
          });
          return;
        }
        
        // Mark ticket as used with enhanced tracking
        await updateDoc(ticketDoc.ref, {
          checkedIn: true,
          checkedInAt: new Date(),
          checkedInBy: currentUser?.email || 'admin',
          checkedInLocation: 'Admin Scanner',
          verificationMethod: 'admin_scanner'
        });

        // Send confirmation email to ticket holder
        let emailSent = false;
        if (event && ticketData.email) {
          console.log('📧 Sending check-in confirmation email...');
          const emailResult = await sendCheckInConfirmationEmail(
            ticketData,
            event,
            currentUser?.email || 'admin'
          );

          if (emailResult.success) {
            console.log('✅ Confirmation email sent successfully');
            emailSent = true;
          } else {
            console.warn('⚠️ Confirmation email failed:', emailResult.error);
          }
        }

        setScanResult({
          success: true,
          message: emailSent
            ? '✅ Valid ticket - Entry approved! Confirmation email sent.'
            : '✅ Valid ticket - Entry approved!',
          type: 'APPROVED',
          ticketData: ticketData,
          timestamp: new Date(),
          emailSent: emailSent
        });
        
      } else {
        setScanResult({
          success: false,
          message: verification.message,
          type: verification.type,
          timestamp: new Date()
        });
      }
      
      // Add to verification history
      const newEntry = {
        id: Date.now(),
        success: verification.valid,
        message: verification.message,
        timestamp: new Date(),
        ticketData: verification.valid ? verification.ticketData : null
      };

      setVerificationHistory(prev => [newEntry, ...prev.slice(0, 9)]); // Keep last 10 entries

      // Update stats
      setStats(prev => ({
        approved: prev.approved + (verification.valid ? 1 : 0),
        rejected: prev.rejected + (verification.valid ? 0 : 1),
        total: prev.total + 1
      }));
      
    } catch (error) {
      console.error('Verification error:', error);
      setScanResult({
        success: false,
        message: 'Verification failed: ' + error.message,
        type: 'ERROR',
        timestamp: new Date()
      });
    }
  };

  const handleManualVerification = () => {
    if (manualInput.trim()) {
      verifyTicket(manualInput.trim());
      setManualInput('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h2>
          <p className="text-gray-600">The requested event could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Responsive Header */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(-1)}
              className="text-primary-600 hover:text-primary-800 flex items-center text-sm sm:text-base transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </button>
          </div>

          <div className="space-y-4 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
            {/* Event Info */}
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center">
                <span className="mr-2">🔍</span>
                <span className="hidden sm:inline">Ticket Scanner</span>
                <span className="sm:hidden">Scanner</span>
              </h1>
              <div className="mt-2 space-y-1">
                <p className="text-sm sm:text-base text-gray-700 font-medium truncate">{event.title}</p>
                <p className="text-xs sm:text-sm text-gray-500">
                  📅 {new Date(event.date).toLocaleDateString()} • 🕐 {event.time}
                </p>
                {event.location && (
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    📍 {event.location}
                  </p>
                )}
              </div>
            </div>

            {/* Responsive Stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6 lg:flex lg:space-x-6">
              <div className="text-center bg-green-50 rounded-lg p-2 sm:p-3 lg:bg-transparent lg:p-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{stats.approved}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">Approved</div>
              </div>
              <div className="text-center bg-red-50 rounded-lg p-2 sm:p-3 lg:bg-transparent lg:p-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{stats.rejected}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">Rejected</div>
              </div>
              <div className="text-center bg-primary-50 rounded-lg p-2 sm:p-3 lg:bg-transparent lg:p-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-primary-600">
                  {event.registrations || 0}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">
                  <span className="hidden sm:inline">Total Registered</span>
                  <span className="sm:hidden">Total</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Responsive Scanner Section */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📱</span>
              <span>QR Code Scanner</span>
            </h2>

            {!scanning ? (
              <div className="text-center space-y-4">
                <div className="w-full max-w-sm mx-auto h-48 sm:h-56 md:h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg sm:rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-gray-400 text-center">
                    <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h.01M12 12v.01M12 21.02V21M4.01 12H4m0 0h.01M4 12v.01" />
                    </svg>
                    <p className="text-sm sm:text-base font-medium">Camera Preview</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Click start to begin scanning</p>
                  </div>
                </div>
                <button
                  onClick={startCamera}
                  className="w-full bg-primary-600 text-white py-2.5 sm:py-3 px-4 rounded-lg hover:bg-primary-700 font-medium text-sm sm:text-base transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                >
                  📷 Start Camera Scanner
                </button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full max-w-sm mx-auto h-48 sm:h-56 md:h-64 bg-black rounded-lg sm:rounded-xl shadow-lg"
                    autoPlay
                    playsInline
                  />
                  {/* Enhanced scanning overlay */}
                  <div className="absolute inset-0 rounded-lg sm:rounded-xl pointer-events-none">
                    {/* Corner brackets */}
                    <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-green-400"></div>
                    <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-green-400"></div>
                    <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-green-400"></div>
                    <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-green-400"></div>

                    {/* Center scanning line */}
                    <div className="absolute inset-x-4 top-1/2 h-0.5 bg-green-400 opacity-60 animate-pulse"></div>

                    {/* Live indicator */}
                    <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
                      <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                      LIVE
                    </div>
                  </div>
                </div>

                <canvas ref={canvasRef} className="hidden" />
                <button
                  onClick={stopCamera}
                  className="w-full bg-red-600 text-white py-2.5 sm:py-3 px-4 rounded-lg hover:bg-red-700 font-medium text-sm sm:text-base transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  ⏹️ Stop Scanner
                </button>
                <p className="text-xs sm:text-sm text-gray-500 mt-2 bg-gray-50 rounded-lg p-2">
                  📍 Point camera at ticket QR code for automatic detection
                </p>
              </div>
            )}

            {/* Manual Input */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-3">✏️ Manual Entry</h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Enter QR code data manually"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={handleManualVerification}
                  disabled={!manualInput.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Verification Results</h2>
            
            {/* Current Result */}
            {scanResult && (
              <div className={`p-4 rounded-lg mb-4 ${
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
                        {scanResult.ticketData.timeSlot && (
                          <p><strong>Time Slot:</strong> {scanResult.ticketData.timeSlot}</p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {scanResult.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Verification History */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Verifications</h3>
              {verificationHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">No verifications yet</p>
              ) : (
                verificationHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded border-l-4 ${
                      item.success 
                        ? 'bg-green-50 border-green-400' 
                        : 'bg-red-50 border-red-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        item.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {item.success ? '✅ Approved' : '❌ Rejected'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {item.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{item.message}</p>
                    {item.ticketData && (
                      <p className="text-xs text-gray-500">
                        {item.ticketData.name} - {item.ticketData.ticketNumber}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
