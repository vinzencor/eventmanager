import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('admin@eventmanager.com');
  const [password, setPassword] = useState('admin123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, setManualRole, currentUser } = useAuth();
  const navigate = useNavigate();

  const fillSampleCredentials = () => {
    setEmail('admin@eventmanager.com');
    setPassword('admin123456');
  };

  const testDirectNavigation = () => {
    console.log('Testing direct navigation to dashboard');
    navigate('/dashboard');
  };

  const assignSuperAdminRole = () => {
    console.log('Manually assigning super admin role');
    setManualRole('super_admin');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      console.log('=== LOGIN ATTEMPT ===');
      console.log('Email:', email);
      console.log('Password length:', password.length);

      const result = await login(email, password);
      console.log('Login result:', result);
      console.log('Login successful, navigating to dashboard');

      // Force navigation after a short delay to ensure auth state is updated
      setTimeout(() => {
        console.log('Executing navigation to /dashboard');
        navigate('/dashboard');
      }, 100);

    } catch (error) {
      console.error('=== LOGIN ERROR ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', error);

      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email. Please create a super admin account first.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else if (error.code === 'auth/invalid-credential') {
        setError('Invalid credentials. Please check your email and password.');
      } else {
        setError('Failed to log in: ' + error.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Event Management
          </h2>
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Sample Credentials:</h3>
            <p className="text-sm text-blue-800">Email: admin@eventmanager.com</p>
            <p className="text-sm text-blue-800">Password: admin123456</p>
            <button
              type="button"
              onClick={fillSampleCredentials}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Use these credentials
            </button>
          </div>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={testDirectNavigation}
              className="block w-full font-medium text-yellow-600 hover:text-yellow-500 text-sm"
            >
              🔧 Test Direct Navigation (Debug)
            </button>
            {currentUser && (
              <button
                type="button"
                onClick={assignSuperAdminRole}
                className="block w-full font-medium text-purple-600 hover:text-purple-500 text-sm"
              >
                🔧 Assign Super Admin Role (Debug)
              </button>
            )}
            <Link
              to="/setup"
              className="block font-medium text-green-600 hover:text-green-500"
            >
              Need to create super admin account?
            </Link>
            <Link
              to="/forgot-password"
              className="block font-medium text-primary-600 hover:text-primary-500"
            >
              Forgot your password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
