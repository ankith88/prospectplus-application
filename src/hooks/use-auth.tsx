
"use client"

import {
    useState,
    useEffect,
    createContext,
    useContext,
    ReactNode,
    useCallback,
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
    sendPasswordResetEmail,
} from 'firebase/auth';
import { app, firestore } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { UserProfile, SavedRoute } from '@/lib/types';
import { getUserRoutes } from '@/services/firebase';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';


interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    savedRoutes: SavedRoute[];
    setSavedRoutes: React.Dispatch<React.SetStateAction<SavedRoute[]>>;
    loading: boolean;
    isSigningIn: boolean;
    isSigningOut: boolean;
    signIn: (email: string, pass: string) => Promise<any>;
    signOut: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    signUpAndCreateProfile: (userData: any) => Promise<void>;
    refreshToken: () => Promise<string | null>;
    isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    savedRoutes: [],
    setSavedRoutes: () => {},
    loading: true,
    isSigningIn: false,
    isSigningOut: false,
    signIn: async () => {},
    signOut: async () => {},
    sendPasswordReset: async () => {},
    signUpAndCreateProfile: async () => {},
    refreshToken: async () => null,
    isSuperAdmin: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [auth, setAuth] = useState<Auth | null>(null);
    const router = useRouter();
    const pathname = usePathname();

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
                        const displayName = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim();
                        const fullProfile: UserProfile = { 
                            uid: user.uid, 
                            displayName: displayName || user.email || '',
                            ...profileData 
                        };
                        setUserProfile(fullProfile);

                        // Fetch saved routes
                        const routes = await getUserRoutes(user.uid);
                        setSavedRoutes(routes);


                        if (user.displayName !== displayName) {
                            await updateProfile(user, { displayName });
                        }
                    } else {
                        setUserProfile(null);
                        setSavedRoutes([]);
                    }
                } else {
                    setUserProfile(null);
                    setSavedRoutes([]);
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
        if (!loading && !user && pathname !== '/signup' && pathname !== '/signin') {
            router.push('/signin');
        }
    }, [user, loading, router, pathname]);


    const signIn = useCallback(async (email: string, pass: string) => {
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
                    const displayName = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim();
                    setUserProfile({ uid: loggedInUser.uid, displayName: displayName || loggedInUser.email || '', ...profileData });
                }
            }
             return userCredential;
        } catch(error) {
            throw error;
        } finally {
            setIsSigningIn(false);
        }
    }, [auth]);

    const signOut = useCallback(async () => {
        if (!auth) return Promise.reject(new Error("Firebase Auth not initialized"));
        setIsSigningOut(true);
        await firebaseSignOut(auth);
        setUser(null);
        setUserProfile(null);
        setSavedRoutes([]);
        setIsSigningOut(false);
    }, [auth]);

    const sendPasswordReset = useCallback(async (email: string) => {
        if (!auth) throw new Error("Firebase Auth not initialized");
        await sendPasswordResetEmail(auth, email);
    }, [auth]);
    
    const signUpAndCreateProfile = useCallback(async (userData: any) => {
        if (!auth) throw new Error("Firebase Auth not initialized");

        const originalUser = auth.currentUser;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
            const newUser = userCredential.user;
            const displayName = `${userData.firstName} ${userData.lastName}`.trim();

            await updateProfile(newUser, { displayName: displayName });

            const userProfileData = {
                uid: newUser.uid,
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                role: userData.role,
                phoneNumber: userData.phoneNumber || null,
                aircallUserId: userData.aircallUserId || null,
                disabled: false,
                linkedSalesRep: userData.linkedSalesRep || null,
                linkedBDR: userData.linkedBDR || null,
                franchisee: userData.franchisee || null,
            };

            await setDoc(doc(firestore, "users", newUser.uid), userProfileData);

        } catch (error) {
            console.error("Error creating user and profile:", error);
            throw error;
        } finally {
            if (auth.currentUser && originalUser && auth.currentUser.uid !== originalUser.uid) {
                await firebaseSignOut(auth);
                console.log("Admin session will be restored on next page load.");
            }
        }
    }, [auth]);

    const refreshToken = useCallback(async () => {
        if (!auth?.currentUser) return null;
        return await auth.currentUser.getIdToken(true);
    }, [auth]);


    const value = {
        user,
        userProfile,
        savedRoutes,
        setSavedRoutes,
        loading,
        isSigningIn,
        isSigningOut,
        signIn,
        signOut,
        sendPasswordReset,
        signUpAndCreateProfile,
        refreshToken,
        isSuperAdmin: userProfile ? SUPER_ADMIN_UIDS.includes(userProfile.uid) : false,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
