
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
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile, SavedRoute, UserRole } from '@/lib/types';
import { getUserRoutes } from '@/services/firebase';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';

const getSydneyDateString = () => {
    const options = { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
    const formatter = new Intl.DateTimeFormat('en-CA', options); // YYYY-MM-DD
    return formatter.format(new Date());
};

const getSessionId = () => {
    if (typeof window === 'undefined') return 'server';
    let sessionId = sessionStorage.getItem('login_session_id');
    if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('login_session_id', sessionId);
    }
    return sessionId;
};

const trackDailyLogin = async (uid: string, email: string, displayName: string) => {
    try {
        const dateStr = getSydneyDateString();
        const sessionId = getSessionId();
        const docId = `${uid}_${dateStr}_${sessionId}`;
        const loginDocRef = doc(firestore, "logins", docId);
        
        await setDoc(loginDocRef, {
            userId: uid,
            userEmail: email,
            userDisplayName: displayName,
            dateStr,
            sessionId,
            timestamp: serverTimestamp(),
            clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        }, { merge: true });
        
        // Also update lastLogin on the user profile doc
        await setDoc(doc(firestore, "users", uid), {
            lastLogin: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error("Failed to track daily login:", error);
    }
};



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
    switchRole: (newRole: UserRole) => void;
    completeOnboardingState: (routeKey: string) => Promise<void>;
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
    switchRole: () => {},
    completeOnboardingState: async () => {},
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
                        
                        if (profileData.disabled) {
                            await firebaseSignOut(authInstance);
                            setUser(null);
                            setUserProfile(null);
                            setSavedRoutes([]);
                            setLoading(false);
                            return;
                        }

                        const displayName = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim();
                        const fullProfile: UserProfile = { 
                            uid: user.uid, 
                            displayName: displayName || user.email || '',
                            ...profileData 
                        };
                        fullProfile.activeRole = fullProfile.defaultRole || (fullProfile.assignedRoles && fullProfile.assignedRoles[0]) || fullProfile.role;
                        setUserProfile(fullProfile);

                        // Track daily login
                        trackDailyLogin(user.uid, user.email || '', displayName || user.email || '');

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
        if (!loading && !user && pathname !== '/signup' && pathname !== '/signin' && !pathname.startsWith('/scf/') && !pathname.startsWith('/hotel-leads') && !pathname.startsWith('/book/')) {
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
                    
                    if (profileData.disabled) {
                        await firebaseSignOut(auth);
                        throw { code: 'auth/user-disabled-custom', message: 'Your account has been disabled. Please contact an administrator.' };
                    }
                    
                    const displayName = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim();
                    const fullProfile: UserProfile = { uid: loggedInUser.uid, displayName: displayName || loggedInUser.email || '', ...profileData };
                    fullProfile.activeRole = fullProfile.defaultRole || (fullProfile.assignedRoles && fullProfile.assignedRoles[0]) || fullProfile.role;
                    setUserProfile(fullProfile);
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
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('login_session_id');
        }
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
                assignedRoles: [userData.role],
                defaultRole: userData.role,
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

    const switchRole = useCallback((newRole: UserRole) => {
        if (userProfile) {
            setUserProfile({ ...userProfile, activeRole: newRole });
            router.push('/');
        }
    }, [userProfile, router]);

    const completeOnboardingState = useCallback(async (routeKey: string) => {
        if (user && userProfile) {
            const updatedStates = { ...userProfile.userOnboardingStates, [routeKey]: true };
            const userDocRef = doc(firestore, "users", user.uid);
            await setDoc(userDocRef, { userOnboardingStates: updatedStates }, { merge: true });
            setUserProfile({ ...userProfile, userOnboardingStates: updatedStates });
        }
    }, [user, userProfile]);

    useEffect(() => {
        if (!user || !userProfile) return;

        const handleActivity = () => {
            trackDailyLogin(user.uid, user.email || '', userProfile.displayName || user.email || '');
        };

        window.addEventListener('focus', handleActivity);
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                handleActivity();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('focus', handleActivity);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user, userProfile]);


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
        switchRole,
        completeOnboardingState,
        isSuperAdmin: userProfile ? SUPER_ADMIN_UIDS.includes(userProfile.uid) : false,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
