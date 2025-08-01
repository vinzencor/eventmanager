import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useRealTimeEvents } from '../../hooks/useRealTimeTickets';

const AdminDashboard = () => {
  const { currentUser, logout, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const { events, loading } = useRealTimeEvents(currentUser?.uid, userRole);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const getFilteredEvents = () => {
    const now = new Date();
    switch (activeTab) {
      case 'upcoming':
        return events.filter(event => new Date(event.date) >= now);
      case 'past':
        return events.filter(event => new Date(event.date) < now);
      case 'sold-out':
        return events.filter(event => event.availableTickets === 0);
      default:
        return events;
    }
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const eventDate = new Date(event.date);
    
    if (event.availableTickets === 0) {
      return { status: 'Sold Out', color: 'bg-red-100 text-red-800' };
    } else if (eventDate < now) {
      return { status: 'Past Event', color: 'bg-gray-100 text-gray-800' };
    } else {
      return { status: 'Active', color: 'bg-green-100 text-green-800' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const filteredEvents = getFilteredEvents();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <Link
                to="/admin/events/create"
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Create Event
              </Link>
              <span className="text-gray-700">Welcome, {currentUser.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">{events.length}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Events</dt>
                    <dd className="text-lg font-medium text-gray-900">Created by you</dd>
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
                    <span className="text-white font-bold">
                      {events.filter(e => new Date(e.date) >= new Date()).length}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Upcoming Events</dt>
                    <dd className="text-lg font-medium text-gray-900">Active</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Registrations</dt>
                    <dd className="text-lg font-medium text-gray-900">All events</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">
                      {events.filter(e => e.availableTickets === 0).length}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Sold Out</dt>
                    <dd className="text-lg font-medium text-gray-900">Events</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'all', name: 'All Events', count: events.length },
              { id: 'upcoming', name: 'Upcoming', count: events.filter(e => new Date(e.date) >= new Date()).length },
              { id: 'past', name: 'Past Events', count: events.filter(e => new Date(e.date) < new Date()).length },
              { id: 'sold-out', name: 'Sold Out', count: events.filter(e => e.availableTickets === 0).length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.name} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Events List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredEvents.map((event) => {
              const eventStatus = getEventStatus(event);
              return (
                <li key={event.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-16 w-16">
                        {event.imageUrl ? (
                          <img className="h-16 w-16 rounded-lg object-cover" src={event.imageUrl} alt="" />
                        ) : (
                          <div className="h-16 w-16 rounded-lg bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 font-medium text-lg">{event.title.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-lg font-medium text-gray-900">{event.title}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(event.date).toLocaleDateString()} at {event.time}
                        </div>
                        {event.location && (
                          <div className="text-sm text-gray-500">{event.location}</div>
                        )}
                        <div className="mt-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${eventStatus.color}`}>
                            {eventStatus.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {event.registrations || 0} / {event.ticketCount}
                        </div>
                        <div className="text-sm text-gray-500">Registered</div>
                        <div className="text-xs text-gray-400">
                          {event.availableTickets} available
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Link
                          to={`/admin/events/${event.id}/preview`}
                          className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded text-sm font-medium text-center"
                        >
                          View
                        </Link>
                        <Link
                          to={`/register/${event.qrCode}`}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium text-center"
                        >
                          QR Link
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
            {filteredEvents.length === 0 && (
              <li className="px-4 py-8 text-center text-gray-500">
                {activeTab === 'all' ? 'No events created yet' : `No ${activeTab} events`}
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
