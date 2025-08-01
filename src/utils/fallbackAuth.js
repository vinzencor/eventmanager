// Fallback authentication utilities for when Firestore is offline

// Simple role detection based on email patterns
export const getFallbackUserRole = (user) => {
  if (!user || !user.email) return null;
  
  // Super admin detection
  if (user.email === 'admin@eventmanager.com') {
    return 'super_admin';
  }
  
  // Temp admin detection (emails containing 'admin' but not the super admin)
  if (user.email.includes('admin') && user.email !== 'admin@eventmanager.com') {
    return 'temp_admin';
  }
  
  // Default to regular user
  return 'user';
};

// Check if user should have access based on email patterns
export const hasAccess = (user) => {
  if (!user) return false;
  
  const role = getFallbackUserRole(user);
  return role === 'super_admin' || role === 'temp_admin';
};

// Create a simple user profile for fallback scenarios
export const createFallbackUserProfile = (user) => {
  if (!user) return null;
  
  const role = getFallbackUserRole(user);
  
  return {
    uid: user.uid,
    email: user.email,
    role: role,
    name: role === 'super_admin' ? 'Super Administrator' : 'Admin User',
    isActive: true,
    createdAt: new Date(),
    isFallback: true // Flag to indicate this is a fallback profile
  };
};
