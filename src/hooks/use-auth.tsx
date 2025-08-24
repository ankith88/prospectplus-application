

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
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

interface UserDetails {
    firstName: string;
    lastName: string;
    phoneNumber: string;
}

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<any>;
    signOut: () => Promise<void>;
    signUp: (email: string, pass: string, details: UserDetails) => Promise<any>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    signIn: async () => {},
    signOut: async () => {},
    signUp: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [auth, setAuth] = useState<Auth | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (app) {
            const authInstance = getAuth(app);
            setAuth(authInstance);
            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                setUser(user);
                if (user) {
                    const userDocRef = doc(firestore, "users", user.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        setUserProfile({ uid: user.uid, ...userDoc.data() } as UserProfile);
                    } else {
                        setUserProfile(null);
                    }
                } else {
                    setUserProfile(null);
                }
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


    const signIn = async (email: string, pass: string) => {
        if (!auth) return Promise.reject(new Error("Firebase Auth not initialized"));
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const loggedInUser = userCredential.user;
        if (loggedInUser) {
            const userDocRef = doc(firestore, "users", loggedInUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                setUserProfile({ uid: loggedInUser.uid, ...userDoc.data() } as UserProfile);
            }
        }
        return userCredential;
    }

    const signUp = async (email: string, pass: string, details: UserDetails) => {
        if (!auth) {
            throw new Error("Firebase Auth not initialized");
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const createdUser = userCredential.user;
        const displayName = `${details.firstName} ${details.lastName}`;

        try {
            await updateProfile(createdUser, { displayName });
            
            const userDocRef = doc(firestore, "users", createdUser.uid);
            const newUserProfile: Omit<UserProfile, 'uid'> = {
                email,
                firstName: details.firstName,
                lastName: details.lastName,
                phoneNumber: details.phoneNumber,
                role: 'user', // Default role
            };
            await setDoc(userDocRef, newUserProfile);
            setUserProfile({ uid: createdUser.uid, ...newUserProfile });
             console.log(`User document created in Firestore for UID: ${createdUser.uid}`);

        } catch (error) {
            console.error('Error creating user profile or document:', error);
            throw new Error('Failed to save user details.');
        }

        const updatedUser = { ...createdUser, displayName } as User;
        setUser(updatedUser);
        
        router.push('/');

        return userCredential;
    }

    const signOut = async () => {
        if (!auth) return Promise.reject(new Error("Firebase Auth not initialized"));
        await firebaseSignOut(auth);
        setUser(null);
        setUserProfile(null);
    };

    const value = {
        user,
        userProfile,
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
