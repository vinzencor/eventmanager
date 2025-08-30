import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const UserManagement = ({ tempAdmins }) => {
  const [loading, setLoading] = useState({});
  const { revokeUserAccess } = useAuth();

  const handleRevokeAccess = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to revoke access for ${userEmail}?`)) {
      return;
    }

    try {
      setLoading({ ...loading, [userId]: true });
      await revokeUserAccess(userId);
    } catch (error) {
      console.error('Failed to revoke access:', error);
      alert('Failed to revoke access: ' + error.message);
    } finally {
      setLoading({ ...loading, [userId]: false });
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Temporary Admins</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Manage temporary admin accounts and their access
        </p>
      </div>
      <div className="max-h-96 overflow-y-auto">
        <ul className="divide-y divide-gray-200">
          {tempAdmins.map((admin) => (
            <li key={admin.id} className="px-4 py-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-600 font-medium">
                        {admin.name ? admin.name.charAt(0).toUpperCase() : admin.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {admin.name || 'No name provided'}
                    </div>
                    <div className="text-sm text-gray-500 truncate">{admin.email}</div>
                    {admin.organization && (
                      <div className="text-xs text-gray-400 truncate">{admin.organization}</div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-right">
                    <div className="mb-1">Created: {new Date(admin.createdAt.toDate()).toLocaleDateString()}</div>
                    <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      admin.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {admin.isActive ? 'Active' : 'Revoked'}
                    </div>
                  </div>
                  {admin.isActive && (
                    <div className="flex justify-center sm:justify-start">
                      <button
                        onClick={() => handleRevokeAccess(admin.id, admin.email)}
                        disabled={loading[admin.id]}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50 transition-colors"
                      >
                        {loading[admin.id] ? 'Revoking...' : 'Revoke Access'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
          {tempAdmins.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-500">No temporary admins created yet</p>
              <p className="text-gray-400 text-sm mt-1">Create your first temp admin to get started</p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default UserManagement;
