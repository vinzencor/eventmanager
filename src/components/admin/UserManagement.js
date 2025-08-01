import React, { useState } from 'react';
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
      <ul className="divide-y divide-gray-200">
        {tempAdmins.map((admin) => (
          <li key={admin.id} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 font-medium">
                      {admin.name ? admin.name.charAt(0).toUpperCase() : admin.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-900">
                    {admin.name || 'No name provided'}
                  </div>
                  <div className="text-sm text-gray-500">{admin.email}</div>
                  {admin.organization && (
                    <div className="text-xs text-gray-400">{admin.organization}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  <div>Created: {new Date(admin.createdAt.toDate()).toLocaleDateString()}</div>
                  <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    admin.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {admin.isActive ? 'Active' : 'Revoked'}
                  </div>
                </div>
                {admin.isActive && (
                  <button
                    onClick={() => handleRevokeAccess(admin.id, admin.email)}
                    disabled={loading[admin.id]}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
                  >
                    {loading[admin.id] ? 'Revoking...' : 'Revoke Access'}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
        {tempAdmins.length === 0 && (
          <li className="px-4 py-8 text-center text-gray-500">
            No temporary admins created yet
          </li>
        )}
      </ul>
    </div>
  );
};

export default UserManagement;
