'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Stethoscope, Lock, Mail, Loader2, ShieldCheck, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { login, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.push('/dashboard');
        }
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await login(email, password);
            router.push('/dashboard');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
            } else {
                setError('حدث خطأ أثناء محاولة تسجيل الدخول. تأكد من اتصالك.');
            }
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full -mr-64 -mt-64 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full -ml-48 -mb-48 blur-3xl" />

            <div className="w-full max-w-md relative animate-in fade-in zoom-in-95 duration-700">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-primary/10 border border-border p-8 md:p-12 space-y-8">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-24 h-24 transform hover:scale-110 transition-transform duration-500">
                            <img
                                src="https://upload.wikimedia.org/wikipedia/ar/f/ff/%D8%A7%D9%84%D9%87%D9%8A%D8%A6%D8%A9_%D8%A7%D9%84%D8%B9%D8%A7%D9%85%D8%A9_%D9%84%D9%84%D8%B1%D8%B9%D8%A7%D9%8A%D8%A9_%D8%A7%D9%84%D8%B5%D8%AD%D9%8A%D8%A9_%28%D9%85%D8%B5%D8%B1%29.png"
                                alt="شعار الهيئة العامة للرعاية الصحية"
                                className="w-full h-full object-contain drop-shadow-xl"
                                crossOrigin="anonymous"
                            />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 leading-tight">استدعاءات اطباء</h1>
                            <p className="text-muted-foreground font-bold mt-1">مجمع الفيروز الطبي - بوابة الدخول</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4 text-right">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 mr-2 flex items-center gap-1 justify-end">
                                    البريد الإلكتروني
                                    <Mail className="w-3 h-3" />
                                </label>
                                <div className="relative group">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@hospital.com"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-primary/10 transition-all text-center placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 mr-2 flex items-center gap-1 justify-end">
                                    كلمة المرور
                                    <Lock className="w-3 h-3" />
                                </label>
                                <div className="relative group">
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-primary/10 transition-all text-center placeholder:text-slate-300"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-xs font-black text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all relative overflow-hidden group disabled:opacity-70"
                        >
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-white" />
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <span>تسجيل الدخول</span>
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-[-4px] transition-transform" />
                                </div>
                            )}
                        </button>
                    </form>

                    <div className="pt-4 flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <ShieldCheck className="w-3 h-3" />
                            نظام آمن ومحمي
                        </div>

                        {/* Admin note: Authentication is now live via Firebase */}
                    </div>
                </div>

                <p className="mt-8 text-center text-xs font-bold text-slate-400">
                    &copy; 2026 مجمع الفيروز الطبي - جميع الحقوق محفوظة
                </p>
            </div>
        </div>
    );
}
