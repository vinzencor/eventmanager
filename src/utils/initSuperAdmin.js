import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// Function to create the initial super admin user
export const createSuperAdmin = async (email, password) => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user document in Firestore with super admin role
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      role: 'super_admin',
      createdAt: new Date(),
      isActive: true,
      name: 'Super Administrator'
    });
    
    console.log('Super admin created successfully!');
    return userCredential;
  } catch (error) {
    console.error('Error creating super admin:', error);
    throw error;
  }
};

// You can run this function once to create your super admin account
// Example usage:
// createSuperAdmin('admin@example.com', 'your-secure-password');
