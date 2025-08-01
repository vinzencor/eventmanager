import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { verifyTicketQR } from '../../services/emailService';

const QRScanner = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
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
        
        // Mark ticket as used
        await updateDoc(ticketDoc.ref, {
          checkedIn: true,
          checkedInAt: new Date(),
          checkedInBy: 'admin' // You can pass actual admin info here
        });
        
        setScanResult({
          success: true,
          message: 'Valid ticket - Entry approved',
          type: 'APPROVED',
          ticketData: ticketData,
          timestamp: new Date()
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
      setVerificationHistory(prev => [
        {
          id: Date.now(),
          success: verification.valid,
          message: verification.message,
          timestamp: new Date(),
          ticketData: verification.valid ? verification.ticketData : null
        },
        ...prev.slice(0, 9) // Keep last 10 entries
      ]);
      
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🔍 Ticket Scanner</h1>
              <p className="text-gray-600 mt-1">{event.title}</p>
              <p className="text-sm text-gray-500">
                {new Date(event.date).toLocaleDateString()} at {event.time}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary-600">
                {event.registrations || 0}
              </div>
              <div className="text-sm text-gray-500">Total Registrations</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📱 QR Code Scanner</h2>
            
            {!scanning ? (
              <div className="text-center">
                <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h.01M12 12v.01M12 21.02V21M4.01 12H4m0 0h.01M4 12v.01" />
                    </svg>
                    <p>Camera Preview</p>
                  </div>
                </div>
                <button
                  onClick={startCamera}
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 font-medium"
                >
                  📷 Start Camera Scanner
                </button>
              </div>
            ) : (
              <div className="text-center">
                <video
                  ref={videoRef}
                  className="w-64 h-64 mx-auto bg-black rounded-lg mb-4"
                  autoPlay
                  playsInline
                />
                <canvas ref={canvasRef} className="hidden" />
                <button
                  onClick={stopCamera}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 font-medium"
                >
                  ⏹️ Stop Scanner
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Point camera at ticket QR code
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
