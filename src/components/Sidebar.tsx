'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Calendar,
    Settings,
    FileText,
    PhoneCall,
    LogOut,
    Stethoscope
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

export function Sidebar() {
    const pathname = usePathname();
    const { user, isAdmin, logout } = useAuth();

    const links = [
        { name: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'viewer'] },
        { name: 'النداء اليومي', href: '/call-sheet', icon: PhoneCall, roles: ['admin', 'viewer'] },
        { name: 'إدارة الأطباء', href: '/dashboard/doctors', icon: Users, roles: ['admin'] },
        { name: 'جدول المناوبات', href: '/dashboard/admin/roster', icon: Calendar, roles: ['admin'] },
        { name: 'إعدادات المناوبات', href: '/dashboard/admin/shifts', icon: Settings, roles: ['admin'] },
        { name: 'التقارير', href: '/dashboard/reports', icon: FileText, roles: ['admin', 'viewer'] },
    ];

    const filteredLinks = links.filter(link =>
        link.roles.includes(user?.role || '')
    );

    return (
        <aside className="w-64 bg-white border-l border-border h-full flex flex-col sticky top-0 no-print">
            <div className="flex items-center gap-3 px-2">
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                    <img
                        src="https://upload.wikimedia.org/wikipedia/ar/f/ff/%D8%A7%D9%84%D9%87%D9%8A%D8%A6%D8%A9_%D8%A7%D9%84%D8%B9%D8%A7%D9%85%D8%A9_%D9%84%D9%84%D8%B1%D8%B9%D8%A7%D9%8A%D8%A9_%D8%A7%D9%84%D8%B5%D8%AD%D9%8A%D8%A9_%28%D9%85%D8%B5%D8%B1%29.png"
                        alt="شعار الهيئة العامة للرعاية الصحية"
                        className="w-full h-full object-contain"
                        crossOrigin="anonymous"
                    />
                </div>
                {/* isCollapsed is not defined in the provided context, so this block will always render */}
                {true && (
                    <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                        <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">استدعاءات اطباء</h1>
                        <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest mt-1">الهيئة العامة للرعاية الصحية</span>
                    </div>
                )}
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {filteredLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-primary text-white shadow-md shadow-primary/20"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                            )}
                        >
                            <Icon className={cn("w-5 h-5", isActive ? "text-white" : "group-hover:text-primary")} />
                            <span className="font-medium">{link.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border bg-slate-50/50">
                <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-border mb-3 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm">
                        {user?.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                            {user?.role === 'admin' ? 'مدير النظام' : 'مشاهد'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/5 transition-all duration-200 font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    <span>تسجيل الخروج</span>
                </button>
            </div>
        </aside>
    );
}
