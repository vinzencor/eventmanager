import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useNavigate } from 'react-router-dom';
import CreateTempAdmin from './CreateTempAdmin';
import UserManagement from './UserManagement';
import { useRealTimeEvents } from '../../hooks/useRealTimeTickets';

const SuperAdminDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tempAdmins, setTempAdmins] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const { events } = useRealTimeEvents(null, 'super_admin');

  useEffect(() => {
    // Listen to temp admins
    const tempAdminsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'temp_admin'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeTempAdmins = onSnapshot(tempAdminsQuery, (snapshot) => {
      const admins = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTempAdmins(admins);
      setLoading(false);
    });

    return () => {
      unsubscribeTempAdmins();
    };
  }, []);



  // Event Management Functions
  const handleCreateEvent = () => {
    navigate('/admin/events/create');
  };

  const handleViewEvent = (eventId) => {
    navigate(`/admin/events/${eventId}`);
  };

  const handleEditEvent = (eventId) => {
    navigate(`/admin/events/${eventId}/edit`);
  };

  const handleDeleteEvent = async (eventId, eventTitle) => {
    if (window.confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'events', eventId));
        console.log('Event deleted successfully');
        // The real-time listener will automatically update the events list
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  const handleScanTickets = (eventId) => {
    navigate(`/admin/events/${eventId}/scan`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                Super Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-3 ml-4">
              <span className="hidden sm:block text-sm text-gray-700 truncate max-w-48">
                Welcome, {currentUser.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'temp-admins', name: 'Temp Admins' },
              { id: 'events', name: 'All Events' },
              { id: 'create-admin', name: 'Create Admin' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-2 sm:px-4 border-b-2 font-medium text-sm flex-shrink-0`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">{tempAdmins.length}</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Temporary Admins
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {tempAdmins.filter(admin => admin.isActive).length} Active
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">{events.length}</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Events
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {events.filter(event => new Date(event.date) > new Date()).length} Upcoming
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">
                        {events.reduce((sum, event) => sum + (event.registrations || 0), 0)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Registrations
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Across all events
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'temp-admins' && <UserManagement tempAdmins={tempAdmins} />}
        {activeTab === 'events' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">All Events</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Manage all events in the system
                </p>
              </div>
              <button
                onClick={handleCreateEvent}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                ➕ Create Event
              </button>
            </div>
            <ul className="divide-y divide-gray-200">
              {events.map((event) => (
                <li key={event.id} className="px-4 py-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0 h-10 w-10">
                        {event.imageUrl ? (
                          <img className="h-10 w-10 rounded-full object-cover" src={event.imageUrl} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 font-medium">{event.title.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{event.title}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(event.date).toLocaleDateString()} at {event.time}
                        </div>
                        <div className="text-xs text-gray-400 sm:hidden">
                          {event.registrations || 0} / {event.ticketCount} registered
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <div className="hidden sm:block text-sm text-gray-500">
                        {event.registrations || 0} / {event.ticketCount} registered
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <button
                          onClick={() => handleViewEvent(event.id)}
                          className="text-primary-600 hover:text-primary-900 text-xs sm:text-sm font-medium px-2 py-1 rounded hover:bg-primary-50"
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => handleEditEvent(event.id)}
                          className="text-yellow-600 hover:text-yellow-900 text-xs sm:text-sm font-medium px-2 py-1 rounded hover:bg-yellow-50"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleScanTickets(event.id)}
                          className="text-green-600 hover:text-green-900 text-xs sm:text-sm font-medium px-2 py-1 rounded hover:bg-green-50"
                        >
                          📱 Scan
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id, event.title)}
                          className="text-red-600 hover:text-red-900 text-xs sm:text-sm font-medium px-2 py-1 rounded hover:bg-red-50"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {activeTab === 'create-admin' && <CreateTempAdmin />}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
