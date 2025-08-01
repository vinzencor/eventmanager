import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const QuickQRScanner = ({ events = [] }) => {
  const navigate = useNavigate();
  const [showEventList, setShowEventList] = useState(false);

  // Get recent/active events for quick access
  const getRecentEvents = () => {
    const now = new Date();
    return events
      .filter(event => {
        const eventDate = new Date(event.date);
        const daysDiff = (eventDate - now) / (1000 * 60 * 60 * 24);
        return daysDiff >= -1 && daysDiff <= 7; // Events from yesterday to next week
      })
      .slice(0, 5); // Limit to 5 recent events
  };

  const recentEvents = getRecentEvents();

  const handleQuickScan = (eventId) => {
    navigate(`/admin/events/${eventId}/scan`);
    setShowEventList(false);
  };

  if (recentEvents.length === 0) {
    return null; // Don't show if no recent events
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Event Selection Popup */}
      {showEventList && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">Select Event to Scan</h3>
            <button
              onClick={() => setShowEventList(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            {recentEvents.map(event => (
              <button
                key={event.id}
                onClick={() => handleQuickScan(event.id)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-primary-300 transition-colors"
              >
                <div className="font-medium text-gray-900 truncate">
                  {event.title}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {new Date(event.date).toLocaleDateString()} • {event.time}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {event.registrations || 0} registered
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Showing recent and upcoming events
            </p>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setShowEventList(!showEventList)}
        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        title="Quick QR Scanner"
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h.01M12 12v.01M12 21.02V21M4.01 12H4m0 0h.01M4 12v.01" 
          />
        </svg>
      </button>

      {/* Badge showing number of recent events */}
      {recentEvents.length > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
          {recentEvents.length}
        </div>
      )}
    </div>
  );
};

export default QuickQRScanner;
