'use client';

import React, { useState } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronRight,
    ChevronLeft,
    Plus,
    Lock,
    Unlock,
    MoreHorizontal,
    User,
    Clock,
    Search,
    Download,
    X,
    FileText
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { mockShiftTypes } from '@/lib/mockData';
import { RosterRecord, Doctor } from '@/lib/types';
import { rosterService, doctorService } from '@/lib/firebase-service';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { forceDownloadExcel } from '@/lib/excel-utils';

export default function RosterPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLocked, setIsLocked] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [rosters, setRosters] = useState<RosterRecord[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    React.useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const monthFilter = format(currentDate, 'yyyy-MM');
                const [docsData, rosterData] = await Promise.all([
                    doctorService.getAll(),
                    rosterService.getByMonth(monthFilter)
                ]);
                setDoctors(docsData);
                setRosters(rosterData);
            } catch (error) {
                console.error("Error loading roster data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [currentDate]);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayIndex = getDay(monthStart); // 0 for Sunday
    const paddingDays = Array.from({ length: startDayIndex }).map((_, i) => i);

    const handleExportRoster = () => {
        const monthFilter = format(currentDate, 'yyyy-MM');
        const monthRosters = rosters.filter(r => r.date.startsWith(monthFilter));

        if (monthRosters.length === 0) {
            alert('لا توجد بيانات لتصديرها في هذا الشهر!');
            return;
        }

        // Setup the days column headers (1-Feb-26 format based on current month)
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

        // Group rosters by doctor
        const groupedByDoctor: Record<string, any> = {};
        monthRosters.forEach(r => {
            if (!groupedByDoctor[r.doctorId]) {
                const doc = doctors.find(d => d.fingerprintCode === r.doctorId);
                groupedByDoctor[r.doctorId] = {
                    'م': Object.keys(groupedByDoctor).length + 1,
                    'الأسم': doc?.fullNameArabic || 'غير معروف',
                    'كود البصمة': r.doctorId,
                    'الوظيفة': doc?.classification || 'غير محدد',
                    'القسم': r.department || doc?.specialty || 'غير محدد',
                    'اذونات': '',
                };
            }
            // Add the shift to the specific day column
            const dayNum = parseInt(r.date.split('-')[2]);
            const dayDate = daysInMonth[dayNum - 1];
            const dayKey = format(dayDate, 'd-MMM-yy', { locale: ar }); // e.g: 1-فبراير-26
            groupedByDoctor[r.doctorId][dayKey] = r.shiftCode;
        });

        // Ensure all day columns exist even if empty, and add notes column at the end
        const dataToExport = Object.values(groupedByDoctor).map((docRow) => {
            daysInMonth.forEach(day => {
                const dayKey = format(day, 'd-MMM-yy', { locale: ar });
                if (!docRow[dayKey]) docRow[dayKey] = '';
            });
            docRow['ملاحظات'] = '';
            return docRow;
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'الجدول التشغيلي');
        ws['!dir'] = 'rtl';
        forceDownloadExcel(wb, `Roster_${monthFilter}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="جدول المناوبات الشهري"
                subtitle="إدارة الجداول الزمنية وتوزيع الأطباء على الورديات"
                actions={
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportRoster}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-border rounded-xl hover:bg-slate-50 transition-all font-bold text-sm"
                        >
                            <Download className="w-4 h-4" />
                            <span>تصدير Excel</span>
                        </button>
                        <button
                            onClick={() => setIsLocked(!isLocked)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm",
                                isLocked ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            )}
                        >
                            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            <span>{isLocked ? 'الجدول مقفل' : 'تعديل الجدول'}</span>
                        </button>
                    </div>
                }
            />

            <div className="bg-white rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-black text-slate-800">
                            {format(currentDate, 'MMMM yyyy', { locale: ar })}
                        </h2>
                        <div className="flex items-center bg-white border border-border rounded-xl p-1">
                            <button
                                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                                className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 text-slate-600" />
                            </button>
                            <button
                                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                                className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6 overflow-x-auto relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-b-[2.5rem]">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                    <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden">
                        {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
                            <div key={day} className="bg-slate-50 py-3 px-2 text-center text-[10px] font-black text-slate-500 uppercase">
                                {day}
                            </div>
                        ))}
                        {/* Empty padding days to align the 1st of the month */}
                        {paddingDays.map(i => (
                            <div key={`padding-${i}`} className="bg-slate-50 min-h-[120px]" />
                        ))}

                        {/* Actual days */}
                        {days.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const dayRoster = rosters.filter(r => r.date === dateStr);

                            return (
                                <div
                                    key={day.toString()}
                                    onClick={() => setSelectedDay(day)}
                                    className="bg-white min-h-[120px] p-2 hover:bg-slate-50/50 transition-colors group relative border-t border-slate-100/50 cursor-pointer"
                                >
                                    <span className={cn(
                                        "w-7 h-7 flex items-center justify-center rounded-full text-sm font-black transition-colors mb-2",
                                        isSameDay(day, new Date()) ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-400 group-hover:text-primary"
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                    <div className="space-y-1 mt-1">
                                        {dayRoster.map(roster => {
                                            const doc = doctors.find(d => d.fingerprintCode === roster.doctorId);
                                            const shift = mockShiftTypes.find(s => s.code === roster.shiftCode);
                                            if (!doc || !shift) return null;

                                            const isConsultant = doc.classificationRank === 1;
                                            const isSpecialist = doc.classificationRank === 2;

                                            return (
                                                <div
                                                    key={roster.id}
                                                    className={cn(
                                                        "text-[10px] p-1.5 rounded flex items-center justify-between border",
                                                        isConsultant ? "bg-amber-50 border-amber-200/50 text-amber-800" :
                                                            isSpecialist ? "bg-blue-50 border-blue-200/50 text-blue-800" :
                                                                "bg-slate-50 border-slate-200/50 text-slate-700"
                                                    )}
                                                >
                                                    <span className="font-bold truncate max-w-[70%]" title={doc.fullNameArabic}>
                                                        {doc.fullNameArabic}
                                                    </span>
                                                    <span className="font-black opacity-60" dir="ltr">{shift.code}</span>
                                                </div>
                                            );
                                        })}
                                        {!isLocked && (
                                            <button className="w-full mt-2 py-1.5 border border-dashed border-slate-200 rounded text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Day Details Modal */}
            {selectedDay && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 max-h-[90vh] flex flex-col">
                        <div className="p-8 bg-slate-50 border-b border-border flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                    <CalendarIcon className="w-6 h-6 text-primary" />
                                    مفصل الورديات اليومي
                                </h3>
                                <p className="text-slate-500 font-bold mt-2">
                                    {format(selectedDay, 'EEEE, d MMMM yyyy', { locale: ar })}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedDay(null)}
                                className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto bg-white flex-1">
                            <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                <table className="w-full text-right">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-border text-slate-500 text-xs font-black uppercase tracking-wider">
                                            <th className="py-4 px-6 w-16 text-center">م</th>
                                            <th className="py-4 px-6">الأسم</th>
                                            <th className="py-4 px-6">كود البصمة</th>
                                            <th className="py-4 px-6">الوظيفة</th>
                                            <th className="py-4 px-6">القسم</th>
                                            <th className="py-4 px-6">المناوبة / التوقيت</th>
                                            <th className="py-4 px-6 text-center">اذونات / ملاحظات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {rosters
                                            .filter(r => r.date === format(selectedDay, 'yyyy-MM-dd'))
                                            .map((roster, idx) => {
                                                const doc = doctors.find(d => d.fingerprintCode === roster.doctorId);
                                                const shift = mockShiftTypes.find(s => s.code === roster.shiftCode);
                                                if (!doc || !shift) return null;

                                                return (
                                                    <tr key={roster.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="py-4 px-6 text-center font-bold text-slate-400">{idx + 1}</td>
                                                        <td className="py-4 px-6 font-black text-slate-900">{doc.fullNameArabic}</td>
                                                        <td className="py-4 px-6 font-mono font-bold text-slate-500">{roster.doctorId}</td>
                                                        <td className="py-4 px-6">
                                                            <span className={cn(
                                                                "px-3 py-1 rounded-full text-[10px] font-black tracking-tight",
                                                                doc.classificationRank === 1 ? "bg-amber-100 text-amber-700" :
                                                                    doc.classificationRank === 2 ? "bg-blue-100 text-blue-700" :
                                                                        "bg-slate-100 text-slate-700"
                                                            )}>
                                                                {doc.classification}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6 text-sm font-bold text-slate-600">{roster.department || doc.specialty}</td>
                                                        <td className="py-4 px-6">
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-primary">{shift.name} ({shift.code})</span>
                                                                <span className="text-xs font-bold text-slate-400" dir="ltr">{shift.startTime} - {shift.endTime}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6 text-center">
                                                            <button className="text-slate-300 hover:text-primary transition-colors p-2 rounded-lg hover:bg-slate-50">
                                                                <FileText className="w-5 h-5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        {rosters.filter(r => r.date === format(selectedDay, 'yyyy-MM-dd')).length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-slate-400 font-bold bg-slate-50/50 border-2 border-dashed border-slate-100 m-4 rounded-xl">
                                                    لا توجد أي مناوبات مسجلة في هذا اليوم.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
