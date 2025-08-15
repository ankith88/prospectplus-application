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
    signOut as firebaseSignOut,
} from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const auth = getAuth(app);

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: typeof signInWithEmailAndPassword;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: signInWithEmailAndPassword,
    signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
            if (!user) {
                router.push('/signin');
            }
        });

        return () => unsubscribe();
    }, [router]);

    const signOut = async () => {
        await firebaseSignOut(auth);
        setUser(null);
    };

    const value = {
        user,
        loading,
        signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
