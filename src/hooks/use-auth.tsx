

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
    ActionCodeSettings,
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
    isSigningOut: boolean;
    signIn: (email: string, pass: string) => Promise<any>;
    signInWithLink: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    isSigningOut: false,
    signIn: async () => {},
    signInWithLink: async () => {},
    signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [auth, setAuth] = useState<Auth | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (app) {
            const authInstance = getAuth(app);
            setAuth(authInstance);

            // Handle sign-in completion from email link
            if (isSignInWithEmailLink(authInstance, window.location.href)) {
                let email = window.localStorage.getItem('emailForSignIn');
                if (!email) {
                    // This can happen if the user opens the link on a different device.
                    email = window.prompt('Please provide your email for confirmation');
                }
                if (email) {
                    signInWithEmailLink(authInstance, email, window.location.href)
                        .then(async (result) => {
                            window.localStorage.removeItem('emailForSignIn');
                            setUser(result.user);
                            const userDocRef = doc(firestore, "users", result.user.uid);
                            const userDoc = await getDoc(userDocRef);
                            if (userDoc.exists()) {
                                setUserProfile({ uid: result.user.uid, ...userDoc.data() } as UserProfile);
                            }
                            router.push('/'); // Redirect to home after successful sign-in
                        })
                        .catch((error) => {
                            console.error("Error signing in with email link:", error);
                            // Handle error, e.g., show a toast notification
                        })
                        .finally(() => setLoading(false));
                } else {
                    setLoading(false);
                }
            } else {
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
            }
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

    const signInWithLink = async (email: string) => {
        if (!auth) throw new Error("Firebase Auth not initialized");
        const actionCodeSettings: ActionCodeSettings = {
            url: window.location.origin + '/leads', // URL to redirect to after sign-in
            handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
    }

    const signOut = async () => {
        if (!auth) return Promise.reject(new Error("Firebase Auth not initialized"));
        setIsSigningOut(true);
        await firebaseSignOut(auth);
        setUser(null);
        setUserProfile(null);
        // The useEffect above will handle the redirect
        setIsSigningOut(false);
    };

    const value = {
        user,
        userProfile,
        loading,
        isSigningOut,
        signIn,
        signInWithLink,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
