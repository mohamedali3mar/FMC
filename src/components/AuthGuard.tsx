'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isAdmin } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // 1. If not logged in, redirect to login
        if (!user) {
            router.push('/login');
            return;
        }

        // 2. Role-based protection
        const adminRoutes = ['/dashboard/admin', '/dashboard/doctors'];
        const isTryingToAccessAdmin = adminRoutes.some(route => pathname.startsWith(route));

        if (isTryingToAccessAdmin && !isAdmin) {
            router.push('/dashboard');
            return;
        }

        setIsAuthorized(true);
    }, [user, isAdmin, pathname, router]);

    if (!isAuthorized) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}
