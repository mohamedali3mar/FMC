'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    showHome?: boolean;
    className?: string;
    actions?: React.ReactNode;
}

export function PageHeader({
    title,
    subtitle,
    showBack = true,
    showHome = true,
    className,
    actions
}: PageHeaderProps) {
    const router = useRouter();

    return (
        <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 no-print", className)}>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    {showHome && (
                        <Link
                            href="/dashboard"
                            className="p-3 bg-white border border-border rounded-2xl text-slate-400 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all shadow-sm group"
                            title="الصفحة الرئيسية"
                        >
                            <Home className="w-5 h-5" />
                        </Link>
                    )}
                    {showBack && (
                        <button
                            onClick={() => router.back()}
                            className="p-3 bg-white border border-border rounded-2xl text-slate-400 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all shadow-sm group"
                            title="رجوع"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="h-10 w-px bg-slate-200 mx-2 hidden md:block" />

                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
                    {subtitle && <p className="text-muted-foreground mt-1 text-sm font-bold">{subtitle}</p>}
                </div>
            </div>

            {actions && (
                <div className="flex items-center gap-3">
                    {actions}
                </div>
            )}
        </div>
    );
}
