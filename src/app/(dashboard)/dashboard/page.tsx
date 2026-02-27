'use client';

import React from 'react';
import {
    Users,
    Stethoscope,
    CalendarCheck,
    Upload,
    PhoneCall,
    ChevronLeft,
    Bell,
    AlertTriangle,
    UserPlus,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { doctorService, rosterService } from '@/lib/firebase-service';
import { getCurrentDateISO, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
    const { isAdmin } = useAuth();
    const today = getCurrentDateISO();
    const [statsData, setStatsData] = React.useState({
        totalDoctors: 0,
        totalSpecialties: 0,
        todayWorking: 0,
        morningShift: 0,
        eveningShift: 0
    });
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const loadData = async () => {
            try {
                const monthPrefix = today.substring(0, 7);
                const [docs, rosters] = await Promise.all([
                    doctorService.getAll(),
                    rosterService.getByMonth(monthPrefix)
                ]);

                const todayRosters = rosters.filter(r => r.date === today);

                setStatsData({
                    totalDoctors: docs.length,
                    totalSpecialties: new Set(docs.map(d => d.specialty)).size,
                    todayWorking: todayRosters.length,
                    morningShift: todayRosters.filter(r => r.shiftCode !== '17E').length,
                    eveningShift: todayRosters.filter(r => r.shiftCode !== '7M').length
                });
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [today]);

    const stats = [
        { name: 'إجمالي الأطباء', value: statsData.totalDoctors, icon: Users, color: 'bg-blue-500' },
        { name: 'التخصصات الطبية', value: statsData.totalSpecialties, icon: Stethoscope, color: 'bg-teal-500' },
        { name: 'مناوبات اليوم', value: statsData.todayWorking, icon: CalendarCheck, color: 'bg-amber-500' },
    ];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">نظرة عامة</h2>
                    <p className="text-muted-foreground mt-1 text-sm font-bold">مجمع الفيروز الطبي - نظام الاستدعاءات</p>
                </div>
                <Link
                    href="/call-sheet"
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all font-medium shadow-lg shadow-primary/25"
                >
                    <PhoneCall className="w-5 h-5" />
                    <span>عرض كشف النداء</span>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.name} className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                                    <h3 className="text-3xl font-bold mt-2 text-slate-900">{stat.value}</h3>
                                </div>
                                <div className={`${stat.color} p-3 rounded-xl text-white shadow-lg shadow-${stat.color.split('-')[1]}-500/20 group-hover:scale-110 transition-transform`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Quick Actions (Admin only) */}
                {isAdmin && (
                    <div className="bg-white p-8 rounded-2xl border border-border shadow-sm">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <div className="w-2 h-6 bg-primary rounded-full" />
                            روابط سريعة للمسؤول
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Link href="/dashboard/admin/roster/upload" className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-teal-50 border border-transparent hover:border-teal-100 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-lg shadow-sm">
                                        <Upload className="w-5 h-5 text-teal-600" />
                                    </div>
                                    <span className="font-medium">رفع جدول إكسل</span>
                                </div>
                                <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:translate-x-[-4px] transition-transform" />
                            </Link>

                            <Link href="/dashboard/doctors" className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-lg shadow-sm">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <span className="font-medium">إضافة طبيب جديد</span>
                                </div>
                                <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:translate-x-[-4px] transition-transform" />
                            </Link>
                        </div>
                    </div>
                )}

                {/* Recent Shifts Info or Daily Summary */}
                <div className="bg-white p-8 rounded-2xl border border-border shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <div className="w-2 h-6 bg-amber-500 rounded-full" />
                        توزيع مناوبات اليوم
                    </h3>
                    {isLoading ? (
                        <div className="flex-1 flex flex-col relative justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 border-b border-slate-50">
                                <span className="text-muted-foreground">الفترة الصباحية</span>
                                <span className="font-bold text-lg">{statsData.morningShift} أطباء</span>
                            </div>
                            <div className="flex items-center justify-between p-4 border-b border-slate-50">
                                <span className="text-muted-foreground">الفترة المسائية</span>
                                <span className="font-bold text-lg">{statsData.eveningShift} أطباء</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
