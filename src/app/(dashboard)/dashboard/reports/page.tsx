'use client';

import React from 'react';
import {
    FileText,
    Download,
    Calendar,
    BarChart3,
    Clock,
    ArrowLeft
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import Link from 'next/link';

export default function ReportsPage() {
    const reports = [
        {
            title: 'كشف النداء اليومي',
            description: 'تقرير يومي مفصل للأطباء المناوبين حسب الفترة والتخصص.',
            icon: FileText,
            color: 'bg-blue-500',
            href: '/call-sheet'
        },
        {
            title: 'إحصائيات المناوبات الشهرية',
            description: 'تحليل عدد الساعات والمناوبات لكل طبيب خلال الشهر.',
            icon: BarChart3,
            color: 'bg-teal-500',
            href: '/dashboard/reports/monthly-stats'
        },
        {
            title: 'تقرير حضور الكادر الطبي',
            description: 'سجل الحصص المناوبة المكتملة بناءً على جدول البصمة.',
            icon: Clock,
            color: 'bg-amber-500',
            href: '/dashboard/reports/attendance'
        }
    ];

    return (
        <div className="space-y-8 max-w-5xl">
            <PageHeader
                title="التقارير الطبية"
                subtitle="عرض وتحميل التقارير والإحصائيات الخاصة بالمناوبات"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reports.map((report) => {
                    const Icon = report.icon;
                    return (
                        <div key={report.title} className="bg-white p-8 rounded-3xl border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                            <div className={`${report.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 shadow-${report.color.split('-')[1]}-500/20`}>
                                <Icon className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">{report.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                                {report.description}
                            </p>
                            <Link
                                href={report.href}
                                className="inline-flex items-center gap-2 text-primary font-bold hover:underline group-hover:gap-3 transition-all"
                            >
                                <span>عرض التقرير</span>
                                <Download className="w-4 h-4" />
                            </Link>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white p-8 rounded-3xl border border-border shadow-sm">
                <h3 className="text-lg font-black mb-6">التقارير الأخيرة</h3>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="bg-white p-2 rounded-xl shadow-sm">
                                    <FileText className="w-5 h-5 text-slate-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">كشف النداء - {20 - i} مايو 2026</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">تم التوليد قبل {i * 2} ساعات</p>
                                </div>
                            </div>
                            <button className="text-slate-400 hover:text-primary p-2">
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
