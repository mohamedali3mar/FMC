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
    User,
    Loader2
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { forceDownloadExcel } from '@/lib/excel-utils';
import { doctorService, rosterService, shiftService } from '@/lib/firebase-service';
import { Doctor, RosterRecord, ShiftType } from '@/lib/types';

export default function MonthlyStatsPage() {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [rosters, setRosters] = useState<RosterRecord[]>([]);
    const [shifts, setShifts] = useState<ShiftType[]>([]);

    const months = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    React.useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const monthStr = String(selectedMonth + 1).padStart(2, '0');
                const monthFilter = `${selectedYear}-${monthStr}`;

                let [docsData, rosterData, shiftsData] = await Promise.all([
                    doctorService.getAll(),
                    rosterService.getByMonth(monthFilter),
                    shiftService.getAll()
                ]);

                // Auto-seed shifts if missing
                if (shiftsData.length === 0) {
                    const { mockShiftTypes } = await import('@/lib/mockData');
                    await shiftService.saveBatch(mockShiftTypes);
                    shiftsData = mockShiftTypes;
                }

                setDoctors(docsData);
                setRosters(rosterData);
                setShifts(shiftsData);
            } catch (error) {
                console.error("Error loading stats data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [selectedMonth, selectedYear]);

    const statsData = useMemo(() => {
        // Create a map of all doctors for quick lookup
        const doctorMap = new Map(doctors.map(d => [d.fingerprintCode, d]));

        // Find all unique doctor IDs in the roster records
        const rosterDoctorIds = Array.from(new Set(rosters.map(r => r.doctorId)));

        // Any doctor in the main database OR in the roster records should be considered
        const allRelevantDoctorIds = Array.from(new Set([...doctors.map(d => d.fingerprintCode), ...rosterDoctorIds]));

        return allRelevantDoctorIds.map(fingerprint => {
            const registeredDoctor = doctorMap.get(fingerprint);
            const doctorShifts = rosters.filter(r => r.doctorId === fingerprint);

            const shiftCounts: Record<string, number> = {};
            let totalHours = 0;
            let totalShifts = 0;

            // Use the department from the first roster record if the doctor isn't registered
            // or if the roster record has a specific department override
            const inferredDept = doctorShifts[0]?.department || (registeredDoctor?.department || '');

            doctorShifts.forEach(record => {
                const shiftCode = (record.shiftCode || '').trim().toUpperCase();
                const shiftType = shifts.find(s => s.code.toUpperCase() === shiftCode);

                // Track counts for the breakdown UI
                shiftCounts[shiftCode] = (shiftCounts[shiftCode] || 0) + 1;

                // If shift type is found, use its duration
                if (shiftType) {
                    if (shiftType.countsAsWorkingShift) {
                        totalHours += shiftType.durationHours;
                        totalShifts += 1;
                    }
                } else {
                    // Fallback: If shift type is NOT found, count it as 1 shift and 0 hours
                    // This ensures the user sees that something was recorded
                    totalShifts += 1;
                }
            });

            return {
                fingerprintCode: fingerprint,
                fullNameArabic: registeredDoctor?.fullNameArabic || `طبيب غير مسجل (${fingerprint})`,
                specialty: registeredDoctor?.specialty || 'غير معروف',
                classification: registeredDoctor?.classification || '---',
                department: inferredDept,
                isRegistered: !!registeredDoctor,
                totalShifts,
                totalHours,
                shiftCounts
            };
        }).filter(d => {
            const search = searchTerm.trim().toLowerCase();
            if (!search) return true;
            return d.fullNameArabic.toLowerCase().includes(search) ||
                (d.department || d.specialty || '').toLowerCase().includes(search) ||
                d.fingerprintCode.toLowerCase().includes(search);
        }).sort((a, b) => b.totalShifts - a.totalShifts);
    }, [doctors, rosters, shifts, searchTerm]);

    const handleExport = () => {
        const data = statsData.map(d => ({
            'اسم الطبيب': d.fullNameArabic,
            'كود البصمة': d.fingerprintCode,
            'التخصص / القسم': d.department || d.specialty,
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
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:bg-emerald-700 transition-all font-black shadow-lg shadow-emerald-600/20 disabled:opacity-50"
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
                {isLoading ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    </div>
                ) : (
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
                                        {/* ... abbreviated for safety ... */}
                                        <td className="py-5 px-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                    <User className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900">{doc.fullNameArabic}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">كود: {doc.fingerprintCode}</p>
                                                        {!doc.isRegistered && (
                                                            <span className="text-[8px] font-black bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded border border-rose-100 animate-pulse">
                                                                غير مسجل في النظام
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-slate-700 flex items-center gap-1">
                                                    <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                                                    {doc.department || doc.specialty}
                                                </span>
                                                {doc.department && doc.specialty && doc.department !== doc.specialty && (
                                                    <span className="text-[10px] font-medium text-slate-400">
                                                        التخصص: {doc.specialty}
                                                    </span>
                                                )}
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
                                {statsData.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 text-slate-300">
                                                <BarChart3 className="w-12 h-12 opacity-20" />
                                                <p className="font-black italic text-slate-400">لا توجد سجلات مناوبات لشهر {months[selectedMonth]} {selectedYear}</p>
                                                <p className="text-xs font-bold text-slate-300">يرجى التأكد من اختيار الشهر الصحيح أو رفع جدول جديد.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
