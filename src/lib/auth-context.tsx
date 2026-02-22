'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isAdmin: boolean;
    appName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch user document from Firestore
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        setUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
                    } else {
                        // Create default user profile if it doesn't exist
                        // Default to admin for early adoption
                        const newUser: User = {
                            id: firebaseUser.uid,
                            name: firebaseUser.email?.split('@')[0] || 'مستخدم',
                            email: firebaseUser.email || '',
                            role: 'admin',
                            isActive: true
                        };
                        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
                        setUser(newUser);
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        await signOut(auth);
    };

    const isAdmin = user?.role === 'admin';

    // While verifying the auth state, you can render a full screen loader or nothing.
    // For seamless transitions, returning nothing while `loading` is true prevents flashes on protected routes.
    if (loading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, isAdmin, appName: 'medical-roster' }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
