'use client';

import React, { useState, useMemo } from 'react';
import {
    BarChart3,
    Download,
    Calendar,
    ChevronRight,
    ChevronLeft,
    Search,
    Stethoscope,
    Clock,
    User
} from 'lucide-react';
import { mockDoctors, mockRoster, mockShiftTypes } from '@/lib/mockData';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { forceDownloadExcel } from '@/lib/excel-utils';

export default function MonthlyStatsPage() {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    const months = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const statsData = useMemo(() => {
        const monthStr = String(selectedMonth + 1).padStart(2, '0');
        const yearMonthPrefix = `${selectedYear}-${monthStr}`;

        return mockDoctors.map(doctor => {
            const doctorShifts = mockRoster.filter(r =>
                r.doctorId === doctor.fingerprintCode &&
                r.date.startsWith(yearMonthPrefix)
            );

            const shiftCounts: Record<string, number> = {};
            let totalHours = 0;
            let totalShifts = 0;

            doctorShifts.forEach(record => {
                const shiftType = mockShiftTypes.find(s => s.code === record.shiftCode);
                if (shiftType && shiftType.countsAsWorkingShift) {
                    shiftCounts[record.shiftCode] = (shiftCounts[record.shiftCode] || 0) + 1;
                    totalHours += shiftType.durationHours;
                    totalShifts += 1;
                }
            });

            return {
                ...doctor,
                totalShifts,
                totalHours,
                shiftCounts
            };
        }).filter(d =>
            d.fullNameArabic.includes(searchTerm) ||
            d.specialty.includes(searchTerm) ||
            d.fingerprintCode.includes(searchTerm)
        ).sort((a, b) => b.totalShifts - a.totalShifts);
    }, [selectedMonth, selectedYear, searchTerm]);

    const handleExport = () => {
        const data = statsData.map(d => ({
            'اسم الطبيب': d.fullNameArabic,
            'كود البصمة': d.fingerprintCode,
            'التخصص': d.specialty,
            'التصنيف': d.classification,
            'إجمالي المناوبات': d.totalShifts,
            'إجمالي الساعات': d.totalHours,
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'إحصائيات');
        ws['!dir'] = 'rtl';
        forceDownloadExcel(wb, `Monthly_Stats_${selectedYear}_${selectedMonth + 1}.xlsx`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <PageHeader
                title="إحصائيات المناوبات الشهرية"
                subtitle="تقرير مفصل لعدد المناوبات والساعات لكل طبيب"
                actions={
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:bg-emerald-700 transition-all font-black shadow-lg shadow-emerald-600/20"
                    >
                        <Download className="w-5 h-5" />
                        <span>تصدير Excel</span>
                    </button>
                }
            />

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2rem] border border-border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-50 rounded-xl px-4 py-2 border border-slate-100">
                        <Calendar className="w-5 h-5 text-primary ml-2" />
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-transparent font-black text-slate-800 outline-none cursor-pointer"
                        >
                            {months.map((m, i) => (
                                <option key={m} value={i}>{m}</option>
                            ))}
                        </select>
                        <span className="mx-2 text-slate-300">|</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent font-black text-slate-800 outline-none cursor-pointer"
                        >
                            <option value={2026}>2026</option>
                            <option value={2025}>2025</option>
                        </select>
                    </div>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="بحث بالاسم، الكود أو التخصص..."
                        className="w-full pr-12 pl-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 transition-all font-bold bg-slate-50/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-border">
                                <th className="py-5 px-8 font-black text-slate-500 text-xs uppercase tracking-widest">الطبيب</th>
                                <th className="py-5 px-8 font-black text-slate-500 text-xs uppercase tracking-widest">التخصص / التصنيف</th>
                                <th className="py-5 px-8 font-black text-slate-500 text-xs uppercase tracking-widest text-center">إجمالي المناوبات</th>
                                <th className="py-5 px-8 font-black text-slate-500 text-xs uppercase tracking-widest text-center">إجمالي الساعات</th>
                                <th className="py-5 px-8 font-black text-slate-500 text-xs uppercase tracking-widest text-center">تفاصيل الأكواد</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {statsData.map((doc) => (
                                <tr key={doc.fingerprintCode} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900">{doc.fullNameArabic}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">كود: {doc.fingerprintCode}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-slate-700 flex items-center gap-1">
                                                <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                                                {doc.specialty}
                                            </span>
                                            <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded w-fit">
                                                {doc.classification}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <span className="text-2xl font-black text-slate-900">{doc.totalShifts}</span>
                                            <span className="text-[10px] font-bold text-emerald-600 uppercase">مناوبة</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <span className="text-2xl font-black text-slate-900">{doc.totalHours}</span>
                                            <span className="text-[10px] font-bold text-blue-600 uppercase">ساعة</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {Object.entries(doc.shiftCounts).map(([code, count]) => (
                                                <div key={code} className="flex items-center gap-1.5 bg-white border border-slate-100 px-3 py-1.5 rounded-xl shadow-sm">
                                                    <span className="text-[10px] font-black text-primary">{code}</span>
                                                    <span className="w-px h-3 bg-slate-200" />
                                                    <span className="text-[10px] font-black text-slate-600">{count}</span>
                                                </div>
                                            ))}
                                            {doc.totalShifts === 0 && (
                                                <span className="text-slate-300 italic text-xs">لا توجد مناوبات</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
