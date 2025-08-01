import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { getFallbackUserRole } from '../utils/fallbackAuth';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // User roles
  const ROLES = {
    SUPER_ADMIN: 'super_admin',
    TEMP_ADMIN: 'temp_admin',
    USER: 'user'
  };

  const signup = async (email, password, role = ROLES.USER, additionalData = {}) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      role: role,
      createdAt: new Date(),
      isActive: true,
      ...additionalData
    });
    
    return userCredential;
  };

  const login = async (email, password) => {
    console.log('AuthContext login called with:', email);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Firebase signInWithEmailAndPassword successful:', result.user.email);

      // Manually trigger role detection after successful login
      console.log('Manually triggering role detection...');
      let role;
      try {
        role = await getUserRole(result.user.uid, result.user.email);
        console.log('Manual role detection result:', role);
      } catch (error) {
        console.error('Manual role detection failed, using direct assignment:', error);
        // Direct role assignment for super admin
        if (result.user.email === 'admin@eventmanager.com') {
          role = 'super_admin';
          console.log('Direct assignment: super_admin for', result.user.email);
        } else {
          role = 'temp_admin'; // Default for other admin emails
        }
      }

      setCurrentUser(result.user);
      setUserRole(role);

      return result;
    } catch (error) {
      console.error('Firebase signInWithEmailAndPassword failed:', error);
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  const createTempAdmin = async (email, password, adminData) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      role: ROLES.TEMP_ADMIN,
      createdAt: new Date(),
      isActive: true,
      createdBy: currentUser.uid,
      ...adminData
    });
    
    return userCredential;
  };

  const revokeUserAccess = async (userId) => {
    await updateDoc(doc(db, 'users', userId), {
      isActive: false,
      revokedAt: new Date(),
      revokedBy: currentUser.uid
    });
  };

  const getUserRole = async (userId, userEmail = null) => {
    console.log('getUserRole called with:', userId, userEmail);
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.isActive ? userData.role : null;
        console.log('Found role in Firestore:', role);
        return role;
      }
      console.log('User document does not exist in Firestore');
      // If document doesn't exist, use fallback
      if (userEmail) {
        const fallbackRole = getFallbackUserRole({ uid: userId, email: userEmail });
        console.log('Using fallback role for non-existent document:', fallbackRole);
        return fallbackRole;
      }
      return null;
    } catch (error) {
      console.warn('Firestore error, using fallback role detection:', error.message);
      // Use fallback role detection when Firestore is offline
      if (userEmail) {
        const fallbackRole = getFallbackUserRole({ uid: userId, email: userEmail });
        console.log('Using fallback role due to error:', fallbackRole);
        return fallbackRole;
      }
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed - user:', user?.email);
      if (user) {
        try {
          // Add timeout to prevent hanging
          const rolePromise = getUserRole(user.uid, user.email);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Role fetch timeout')), 5000)
          );

          const role = await Promise.race([rolePromise, timeoutPromise]);
          console.log('Got role:', role);
          setCurrentUser(user);
          setUserRole(role);
        } catch (error) {
          console.error('Error getting role, using fallback:', error.message);
          // Use fallback role detection
          const fallbackRole = getFallbackUserRole(user);
          console.log('Using fallback role:', fallbackRole);
          setCurrentUser(user);
          setUserRole(fallbackRole);
        }
      } else {
        console.log('User logged out');
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Manual role assignment function for debugging
  const setManualRole = (role) => {
    console.log('Manual role assignment:', role);
    setUserRole(role);
  };

  const value = {
    currentUser,
    userRole,
    ROLES,
    signup,
    login,
    logout,
    resetPassword,
    createTempAdmin,
    revokeUserAccess,
    getUserRole,
    setManualRole
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
