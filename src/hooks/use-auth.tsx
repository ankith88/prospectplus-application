

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
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
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
    isSigningIn: boolean;
    isSigningOut: boolean;
    signIn: (email: string, pass: string) => Promise<any>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    isSigningIn: false,
    isSigningOut: false,
    signIn: async () => {},
    signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
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
                        const profileData = userDoc.data() as Omit<UserProfile, 'uid' | 'displayName'>;
                        const displayName = `${profileData.firstName} ${profileData.lastName}`;
                        const fullProfile: UserProfile = { 
                            uid: user.uid, 
                            displayName,
                            ...profileData 
                        };
                        setUserProfile(fullProfile);

                        if (user.displayName !== displayName) {
                            await updateProfile(user, { displayName });
                            // After updating the profile, the auth state listener will
                            // fire again with the updated user object. We don't need to reload manually.
                        }
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
    }, [router]);

    useEffect(() => {
        if (!loading && !user && window.location.pathname !== '/signup' && window.location.pathname !== '/signin') {
            router.push('/signin');
        }
    }, [user, loading, router]);


    const signIn = async (email: string, pass: string) => {
        if (!auth) return Promise.reject(new Error("Firebase Auth not initialized"));
        setIsSigningIn(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);
            const loggedInUser = userCredential.user;
            if (loggedInUser) {
                const userDocRef = doc(firestore, "users", loggedInUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const profileData = userDoc.data() as Omit<UserProfile, 'uid' | 'displayName'>;
                    const displayName = `${profileData.firstName} ${profileData.lastName}`;
                    setUserProfile({ uid: loggedInUser.uid, displayName, ...profileData });
                }
            }
             return userCredential;
        } catch(error) {
            // Rethrow the error to be caught by the calling component
            throw error;
        } finally {
            setIsSigningIn(false);
        }
    }

    const signOut = async () => {
        if (!auth) return Promise.reject(new Error("Firebase Auth not initialized"));
        setIsSigningOut(true);
        await firebaseSignOut(auth);
        setUser(null);
        setUserProfile(null);
        setIsSigningOut(false);
    };

    const value = {
        user,
        userProfile,
        loading,
        isSigningIn,
        isSigningOut,
        signIn,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
