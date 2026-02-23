'use client';

import { CallSheetDisplay } from "@/components/CallSheetDisplay";
import Link from "next/link";


export default function PublicCallSheetPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Simple Public Header */}
            <header className="bg-white border-b border-slate-200 no-print">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-12 h-12 flex items-center justify-center shrink-0">
                            <img
                                src="https://upload.wikimedia.org/wikipedia/ar/f/ff/%D8%A7%D9%84%D9%87%D9%8A%D8%A6%D8%A9_%D8%A7%D9%84%D8%B9%D8%A7%D9%85%D8%A9_%D9%84%D9%84%D8%B1%D8%B9%D8%A7%D9%8A%D8%A9_%D8%A7%D9%84%D8%B5%D8%AD%D9%8A%D8%A9_%28%D9%85%D8%B5%D8%B1%29.png"
                                alt="شعار الهيئة"
                                className="w-full h-full object-contain"
                                crossOrigin="anonymous"
                            />
                        </div>
                        <span className="font-black text-slate-900 tracking-tight">مجمع الفيروز الطبي</span>
                    </div>
                    <Link
                        href="/login"
                        className="text-sm font-bold text-slate-500 hover:text-primary transition-colors"
                    >
                        دخول الموظفين
                    </Link>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 py-10">
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-12">
                    <CallSheetDisplay isPublic={true} />
                </div>
            </main>

            {/* Simple Footer */}
            <footer className="py-8 text-center text-slate-400 text-xs font-bold no-print">
                <p>© {new Date().getFullYear()} مجمع الفيروز الطبي - جميع الحقوق محفوظة</p>
            </footer>
        </div>
    );
}
