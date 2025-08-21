
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
import { app } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { createUserInFirestore } from '@/services/firebase';

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
                if (!user) {
                    router.push('/signin');
                }
            });

            return () => unsubscribe();
        } else {
            setLoading(false);
            router.push('/signin');
        }
    }, [router]);

    const signIn = (email: string, pass: string) => {
        if (!auth) return Promise.reject(new Error("Firebase Auth not initialized"));
        return signInWithEmailAndPassword(auth, email, pass);
    }

    const signUp = async (email: string, pass: string, details: UserDetails) => {
        if (!auth) return Promise.reject(new Error("Firebase Auth not initialized"));
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const { user } = userCredential;

        await updateProfile(user, {
            displayName: `${details.firstName} ${details.lastName}`,
        });
        
        await createUserInFirestore(user.uid, {
            email,
            firstName: details.firstName,
            lastName: details.lastName,
            phoneNumber: details.phoneNumber,
        });

        // Manually update the user object with the new display name to ensure the state is current
        user.displayName = `${details.firstName} ${details.lastName}`;
        setUser(user);

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
