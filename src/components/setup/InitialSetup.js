import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';

const InitialSetup = ({ onSetupComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  const createSuperAdmin = async () => {
    const email = 'admin@eventmanager.com';
    const password = 'admin123456';

    try {
      setLoading(true);
      setError('');

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Try to create user document in Firestore with retry logic
      let retries = 3;
      let docCreated = false;

      while (retries > 0 && !docCreated) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            role: 'super_admin',
            createdAt: new Date(),
            isActive: true,
            name: 'Super Administrator'
          });
          docCreated = true;
        } catch (firestoreError) {
          console.warn(`Firestore attempt ${4 - retries} failed:`, firestoreError);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }

      if (docCreated) {
        setSuccess('Super admin created successfully!');
      } else {
        setSuccess('Super admin account created! (Note: Some features may be limited until Firestore connection is established)');
      }

      setTimeout(() => {
        onSetupComplete();
      }, 2000);

    } catch (error) {
      console.error('Error creating super admin:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Super admin account already exists. You can now login.');
        setTimeout(() => {
          onSetupComplete();
        }, 2000);
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to create super admin: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    const email = 'admin@eventmanager.com';
    const password = 'admin123456';

    try {
      setTestLoading(true);
      setError('');
      setSuccess('');

      console.log('Testing login with:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Test login successful:', result.user.email);
      setSuccess('✅ Login test successful! Account exists and credentials work.');

      // Sign out after test
      await auth.signOut();

    } catch (error) {
      console.error('Test login failed:', error);
      setError('❌ Login test failed: ' + error.message);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Initial Setup Required
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create the super admin account to get started
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Super Admin Credentials</h3>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-700"><strong>Email:</strong> admin@eventmanager.com</p>
              <p className="text-sm text-gray-700"><strong>Password:</strong> admin123456</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={createSuperAdmin}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Creating Super Admin...' : 'Create Super Admin Account'}
            </button>

            <button
              onClick={testLogin}
              disabled={testLoading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {testLoading ? 'Testing Login...' : '🔧 Test Login Credentials'}
            </button>
          </div>
          
          <p className="mt-4 text-xs text-gray-500 text-center">
            This will create the initial super admin account that you can use to manage the system.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InitialSetup;
