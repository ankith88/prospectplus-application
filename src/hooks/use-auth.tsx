
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
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
        
        const existingLoginDoc = await getDoc(loginDocRef);
        const userDocRef = doc(firestore, "users", uid);
        const userDoc = await getDoc(userDocRef);

        const userData = userDoc.exists() ? userDoc.data() : {};
        const isFirstLoginToday = userData.lastLoginDateStr !== dateStr;

        if (!existingLoginDoc.exists()) {
            // New session creation - set initial timestamp & lastActiveTimestamp
            await setDoc(loginDocRef, {
                userId: uid,
                userEmail: email,
                userDisplayName: displayName,
                dateStr,
                sessionId,
                timestamp: serverTimestamp(),
                lastActiveTimestamp: serverTimestamp(),
                isFirstLoginOfDay: isFirstLoginToday,
                clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            }, { merge: true });
        } else {
            // Session already exists for this tab - ONLY update lastActiveTimestamp, DO NOT overwrite initial timestamp
            await setDoc(loginDocRef, {
                lastActiveTimestamp: serverTimestamp(),
                clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            }, { merge: true });
        }
        
        // Update lastLogin & lastLoginDateStr on the user profile doc
        const profileUpdate: Record<string, any> = {
            lastLogin: serverTimestamp(),
            lastLoginDateStr: dateStr,
        };
        if (isFirstLoginToday) {
            profileUpdate.firstLoginToday = serverTimestamp();
        }
        await setDoc(userDocRef, profileUpdate, { merge: true });
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
    signUpAndCreateProfile: (userData: any) => Promise<string | void>;
    refreshToken: () => Promise<string | null>;
    switchRole: (newRole: UserRole) => void;
    switchFranchisee: (franchiseeId: string) => Promise<void>;
    completeOnboardingState: (routeKey: string) => Promise<void>;
    updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
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
    switchFranchisee: async () => {},
    completeOnboardingState: async () => {},
    updateUserProfile: async () => {},
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
                        const savedRole = typeof window !== 'undefined' ? localStorage.getItem(`activeRole_${user.uid}`) as UserRole : null;
                        const validRole = savedRole && (fullProfile.assignedRoles?.includes(savedRole) || fullProfile.role === savedRole) ? savedRole : null;
                        fullProfile.activeRole = validRole || fullProfile.defaultRole || (fullProfile.assignedRoles && fullProfile.assignedRoles[0]) || fullProfile.role;

                        if (fullProfile.linkedFranchisees && fullProfile.linkedFranchisees.length > 0) {
                            const savedFranId = typeof window !== 'undefined' ? localStorage.getItem(`activeFranchiseeId_${user.uid}`) : null;
                            const activeFran = fullProfile.linkedFranchisees.find(f => f.franchiseeId === savedFranId) || fullProfile.linkedFranchisees[0];
                            if (activeFran) {
                                fullProfile.activeFranchiseeId = activeFran.franchiseeId;
                                fullProfile.franchiseeId = activeFran.franchiseeId;
                                fullProfile.franchiseeInternalId = activeFran.franchiseeId;
                                fullProfile.franchisee = activeFran.franchiseeName;
                                fullProfile.franchiseeRole = activeFran.relationship;
                            }
                        }

                        setUserProfile(fullProfile);

                        // Track daily login only when tab is actively visible (prevents background tab refreshes overnight)
                        const runTracking = () => trackDailyLogin(user.uid, user.email || '', displayName || user.email || '');
                        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                            const handleVisibilityChange = () => {
                                if (document.visibilityState === 'visible') {
                                    runTracking();
                                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                                }
                            };
                            document.addEventListener('visibilitychange', handleVisibilityChange);
                        } else {
                            runTracking();
                        }

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
        if (
            !loading && 
            !user && 
            pathname !== '/signup' && 
            pathname !== '/signin' && 
            !pathname.startsWith('/scf/') && 
            !pathname.startsWith('/sof/') && 
            !pathname.startsWith('/lpo-opportunity/') && 
            !pathname.startsWith('/hotel-leads') && 
            !pathname.startsWith('/book/') && 
            !pathname.startsWith('/localmile-registration/')
        ) {
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
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem(`activeRole_${loggedInUser.uid}`);
                        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
                        localStorage.setItem('last_session_day', today);
                        localStorage.setItem('session_init_time', new Date().toISOString());
                        localStorage.setItem('last_activity_time', Date.now().toString());
                    }
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
            if (userProfile?.uid) {
                localStorage.removeItem(`activeRole_${userProfile.uid}`);
            }
            localStorage.removeItem('session_init_time');
            localStorage.removeItem('last_session_day');
            localStorage.removeItem('last_activity_time');
        }
        await firebaseSignOut(auth);
        setUser(null);
        setUserProfile(null);
        setSavedRoutes([]);
        setIsSigningOut(false);
    }, [auth, userProfile]);

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

            const franchiseeIdVal = userData.franchiseeId || userData.franchiseeInternalId || null;
            const franchiseeRoleVal = userData.franchiseeRole || 'owner';

            let linkedFrans: Array<{ franchiseeId: string; franchiseeName: string; relationship: 'owner' | 'investor'; isDefault?: boolean }> = userData.linkedFranchisees || [];
            if (linkedFrans.length === 0 && franchiseeIdVal) {
                linkedFrans = [{
                    franchiseeId: franchiseeIdVal,
                    franchiseeName: userData.franchisee || '',
                    relationship: franchiseeRoleVal,
                    isDefault: true,
                }];
            }

            const userProfileData: Record<string, any> = {
                uid: newUser.uid,
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                assignedRoles: [userData.role],
                defaultRole: userData.role,
                phoneNumber: userData.mobileNumber || userData.phoneNumber || null,
                mobileNumber: userData.mobileNumber || userData.phoneNumber || null,
                aircallPhoneNumber: userData.aircallPhoneNumber || null,
                aircallUserId: userData.aircallUserId || null,
                disabled: false,
                linkedSalesRep: userData.linkedSalesRep || null,
                linkedBDR: userData.linkedBDR || null,
                franchisee: userData.franchisee || null,
                franchiseeId: franchiseeIdVal,
                franchiseeInternalId: franchiseeIdVal,
                franchiseeRole: franchiseeRoleVal,
                personalEmail: userData.personalEmail || null,
                abn: userData.abn || null,
                addressDetails: userData.addressDetails || null,
                bankDetails: userData.bankDetails || null,
                linkedFranchisees: linkedFrans,
                activeFranchiseeId: franchiseeIdVal,
            };

            await setDoc(doc(firestore, "users", newUser.uid), userProfileData);

            // Sync with franchisees collection for each linked franchisee
            if (linkedFrans.length > 0 && (userData.role === 'Franchisee' || userData.role?.toLowerCase() === 'franchisee')) {
                for (const fran of linkedFrans) {
                    if (!fran.franchiseeId) continue;
                    try {
                        const franRef = doc(firestore, "franchisees", fran.franchiseeId);
                        const franSnap = await getDoc(franRef);
                        if (franSnap.exists()) {
                            const existingData = franSnap.data() || {};
                            const existingUserIds: string[] = existingData.linkedUserIds || [];
                            const updatedUserIds = Array.from(new Set([...existingUserIds, newUser.uid]));

                            const userDetailObj = {
                                userId: newUser.uid,
                                name: displayName,
                                email: userData.email,
                                personalEmail: userData.personalEmail || '',
                                abn: userData.abn || '',
                                bankDetails: userData.bankDetails || {},
                                addressDetails: userData.addressDetails || {},
                                relationship: fran.relationship,
                            };

                            const existingLinked: any[] = existingData.linkedUsers || [];
                            const filteredLinked = existingLinked.filter((u: any) => u.userId !== newUser.uid);
                            filteredLinked.push(userDetailObj);

                            const existingOwners: any[] = existingData.owners || [];
                            const filteredOwners = existingOwners.filter((u: any) => u.userId !== newUser.uid);
                            if (fran.relationship === 'owner') filteredOwners.push(userDetailObj);

                            const existingInvestors: any[] = existingData.investors || [];
                            const filteredInvestors = existingInvestors.filter((u: any) => u.userId !== newUser.uid);
                            if (fran.relationship === 'investor') filteredInvestors.push(userDetailObj);

                            const updatePayload: Record<string, any> = {
                                linkedUserIds: updatedUserIds,
                                linkedUsers: filteredLinked,
                                owners: filteredOwners,
                                investors: filteredInvestors,
                                updatedAt: new Date().toISOString(),
                            };

                            if (fran.relationship === 'owner') {
                                updatePayload.currentOwnerUserId = newUser.uid;
                                updatePayload.linkedUserEmail = userData.email;
                                updatePayload.mainContact = displayName || existingData.mainContact;
                            }

                            await updateDoc(franRef, updatePayload);
                        }
                    } catch (franLinkErr) {
                        console.warn("Could not automatically update franchisee doc on user creation:", franLinkErr);
                    }
                }
            }

            return newUser.uid;

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

    const switchRole = useCallback(async (newRole: UserRole) => {
        if (userProfile) {
            if (typeof window !== 'undefined') {
                localStorage.setItem(`activeRole_${userProfile.uid}`, newRole);
            }
            setUserProfile({ ...userProfile, activeRole: newRole });
            if (user) {
                const userDocRef = doc(firestore, "users", user.uid);
                await updateDoc(userDocRef, { activeRole: newRole }).catch(err => console.warn("Failed saving active role to Firestore:", err));
            }
            router.push('/');
        }
    }, [user, userProfile, router]);

    const switchFranchisee = useCallback(async (targetFranchiseeId: string) => {
        if (!userProfile) return;
        const target = userProfile.linkedFranchisees?.find(f => f.franchiseeId === targetFranchiseeId);
        if (target) {
            const updates: Partial<UserProfile> = {
                activeFranchiseeId: target.franchiseeId,
                franchiseeId: target.franchiseeId,
                franchiseeInternalId: target.franchiseeId,
                franchisee: target.franchiseeName,
                franchiseeRole: target.relationship,
            };
            if (typeof window !== 'undefined') {
                localStorage.setItem(`activeFranchiseeId_${userProfile.uid}`, target.franchiseeId);
            }
            setUserProfile(prev => prev ? { ...prev, ...updates } : prev);
            if (user) {
                const userDocRef = doc(firestore, "users", user.uid);
                await updateDoc(userDocRef, updates).catch(err => console.warn("Failed saving active franchisee to Firestore:", err));
            }
        }
    }, [user, userProfile]);

    const completeOnboardingState = useCallback(async (routeKey: string) => {
        if (user && userProfile) {
            const updatedStates = { ...userProfile.userOnboardingStates, [routeKey]: true };
            const userDocRef = doc(firestore, "users", user.uid);
            await setDoc(userDocRef, { userOnboardingStates: updatedStates }, { merge: true });
            setUserProfile({ ...userProfile, userOnboardingStates: updatedStates });
        }
    }, [user, userProfile]);

    const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
        if (user && userProfile) {
            const userDocRef = doc(firestore, "users", user.uid);
            await setDoc(userDocRef, updates, { merge: true });
            setUserProfile({ ...userProfile, ...updates });
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
        switchFranchisee,
        completeOnboardingState,
        updateUserProfile,
        isSuperAdmin: userProfile ? SUPER_ADMIN_UIDS.includes(userProfile.uid) : false,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
