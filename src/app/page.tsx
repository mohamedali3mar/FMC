'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Stethoscope } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const router = useRouter();

  const { user } = useAuth();

  useEffect(() => {
    // Redirect based on auth state
    // Removed auto-login logic. Now it always redirects to login.
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-6">
      <div className="bg-primary p-4 rounded-3xl shadow-2xl shadow-primary/20 animate-bounce">
        <Stethoscope className="w-12 h-12 text-white" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black text-slate-900">جاري تحميل النظام...</h1>
        <p className="text-muted-foreground font-bold">نظام إدارة جداول الأطباء والنداء اليومي</p>
      </div>
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}
