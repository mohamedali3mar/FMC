'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
      <div className="w-24 h-24 transform hover:scale-110 transition-transform duration-500">
        <img
          src="https://upload.wikimedia.org/wikipedia/ar/f/ff/%D8%A7%D9%84%D9%87%D9%8A%D8%A6%D8%A9_%D8%A7%D9%84%D8%B9%D8%A7%D9%85%D8%A9_%D9%84%D9%84%D8%B1%D8%B9%D8%A7%D9%8A%D8%A9_%D8%A7%D9%84%D8%B5%D8%AD%D9%8A%D8%A9_%28%D9%85%D8%B5%D8%B1%29.png"
          alt="شعار الهيئة"
          className="w-full h-full object-contain animate-pulse"
          crossOrigin="anonymous"
        />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black text-slate-900">جاري تحميل النظام...</h1>
        <p className="text-muted-foreground font-bold">نظام إدارة جداول الأطباء والنداء اليومي</p>
      </div>
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}
