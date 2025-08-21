
"use client"

import {
    useState,
    useEffect,
    createContext,
    useContext,
    ReactNode,
} from 'react';
import {
    getAuth,
    onAuthStateChanged,
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    updateProfile,
    Auth,
} from 'firebase/auth';
import { app, firestore } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';

interface UserDetails {
    firstName: string;
    lastName: string;
    phoneNumber: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<any>;
    signOut: () => Promise<void>;
    signUp: (email: string, pass: string, details: UserDetails) => Promise<any>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => {},
    signOut: async () => {},
    signUp: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [auth, setAuth] = useState<Auth | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (app) {
            const authInstance = getAuth(app);
            setAuth(authInstance);
            const unsubscribe = onAuthStateChanged(authInstance, (user) => {
                setUser(user);
                setLoading(false);
            });

            return () => unsubscribe();
        } else {
            setLoading(false);
            console.error("Firebase app not initialized. Auth functionality will not work.");
        }
    }, []);

    useEffect(() => {
        if (!loading && !user && window.location.pathname !== '/signup' && window.location.pathname !== '/signin') {
            router.push('/signin');
        }
    }, [user, loading, router]);


    const signIn = (email: string, pass: string) => {
        if (!auth) return Promise.reject(new Error("Firebase Auth not initialized"));
        return signInWithEmailAndPassword(auth, email, pass);
    }

    const signUp = async (email: string, pass: string, details: UserDetails) => {
        if (!auth) {
            throw new Error("Firebase Auth not initialized");
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const createdUser = userCredential.user;
        const displayName = `${details.firstName} ${details.lastName}`;

        try {
            // Update profile and create firestore entry
            await updateProfile(createdUser, { displayName });
            
            const userDocRef = doc(firestore, "users", createdUser.uid);
            await setDoc(userDocRef, {
                email,
                firstName: details.firstName,
                lastName: details.lastName,
                phoneNumber: details.phoneNumber,
            });
             console.log(`User document created in Firestore for UID: ${createdUser.uid}`);

        } catch (error) {
            console.error('Error creating user profile or document:', error);
            // Optionally, you might want to delete the user from Auth if the DB write fails
            // await createdUser.delete();
            throw new Error('Failed to save user details.');
        }


        // Manually update the user object to reflect the new display name immediately
        const updatedUser = { ...createdUser, displayName } as User;
        setUser(updatedUser);
        
        router.push('/');

        return userCredential;
    }

    const signOut = async () => {
        if (!auth) return Promise.reject(new Error("Firebase Auth not initialized"));
        await firebaseSignOut(auth);
        setUser(null);
    };

    const value = {
        user,
        loading,
        signIn,
        signOut,
        signUp,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
