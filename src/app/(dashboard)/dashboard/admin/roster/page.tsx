'use client';

import React, { useState } from 'react';
import {
    Plus,
    ChevronRight,
    ChevronLeft,
    Calendar as CalendarIcon,
    Filter,
    Search,
    Edit2,
    Trash2,
    Save,
    X,
    LayoutGrid,
    Table,
    Download,
    Lock,
    Unlock,
    Loader2,
    Maximize2,
    RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { mockShiftTypes } from '@/lib/mockData';
import { RosterRecord, Doctor, ShiftType } from '@/lib/types';
import { rosterService, doctorService, shiftService } from '@/lib/firebase-service';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { forceDownloadExcel } from '@/lib/excel-utils';
import { detectShiftConflicts } from '@/lib/roster-utils';

export default function RosterPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLocked, setIsLocked] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [rosters, setRosters] = useState<RosterRecord[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [currentAssignment, setCurrentAssignment] = useState<Partial<RosterRecord> | null>(null);

    React.useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const monthFilter = format(currentDate, 'yyyy-MM');
                const [docsData, rosterData, shiftsData] = await Promise.all([
                    doctorService.getAll(),
                    rosterService.getByMonth(monthFilter),
                    shiftService.getAll()
                ]);
                setDoctors(docsData);
                setRosters(rosterData);
                setShiftTypes(shiftsData.length > 0 ? shiftsData : mockShiftTypes);
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

    const getAssignmentsForDay = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return rosters.filter(r => r.date === dateStr);
    };

    const handleExportRoster = () => {
        const monthFilter = format(currentDate, 'yyyy-MM');
        const monthRosters = rosters.filter(r => r.date.startsWith(monthFilter));

        if (monthRosters.length === 0) {
            alert('لا توجد بيانات لتصديرها في هذا الشهر!');
            return;
        }

        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
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
            const dayNum = parseInt(r.date.split('-')[2]);
            const dayDate = daysInMonth[dayNum - 1];
            const dayKey = format(dayDate, 'd-MMM-yy', { locale: ar });
            groupedByDoctor[r.doctorId][dayKey] = r.shiftCode;
        });

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

    const handleOpenAssignmentModal = (day: Date, roster: RosterRecord | null = null) => {
        if (isLocked) return;
        setCurrentAssignment(roster || {
            date: format(day, 'yyyy-MM-dd'),
            doctorId: '',
            shiftCode: '',
            department: '',
            id: '',
        });
        setIsAssignmentModalOpen(true);
    };


    const handleSaveAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentAssignment || !currentAssignment.doctorId || !currentAssignment.shiftCode) return;

        try {
            setIsLoading(true);
            const roster = currentAssignment as RosterRecord;

            // Shift Conflict Validation (6-hour rest rule)
            const doctorRosters = rosters.filter(r => r.doctorId === roster.doctorId && r.id !== roster.id);
            const tempRosters = [...doctorRosters, roster];
            const conflicts = detectShiftConflicts(tempRosters, shiftTypes);

            if (conflicts.length > 0) {
                const messages = conflicts.map(c => c.message).join('\n');
                if (!window.confirm(`⚠️ تنبيه تضارب آلي:\n\n${messages}\n\nهل تريد حفظ التكليف رغم ذلك؟`)) {
                    setIsLoading(false);
                    return;
                }
            }

            await rosterService.save(roster);
            const monthFilter = format(currentDate, 'yyyy-MM');
            const updatedRosters = await rosterService.getByMonth(monthFilter);
            setRosters(updatedRosters);
            setIsAssignmentModalOpen(false);
        } catch (error) {
            alert("حدث خطأ أثناء حفظ التكليف");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAssignment = async (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذا التكليف؟')) {
            try {
                setIsLoading(true);
                await rosterService.delete(id);
                setRosters(rosters.filter(r => r.id !== id));
            } catch (error) {
                alert("حدث خطأ أثناء الحذف");
            } finally {
                setIsLoading(false);
            }
        }
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
                        <button
                            onClick={async () => {
                                const monthName = format(currentDate, 'MMMM yyyy', { locale: ar });
                                if (window.confirm(`هل أنت متأكد من رغبتك في تنظيف السجلات المكررة لشهر ${monthName}؟ سيقوم النظام بمسح السجلات القديمة وإبقاء سجل واحد فقط لكل طبيب في اليوم.`)) {
                                    try {
                                        const monthPrefix = format(currentDate, 'yyyy-MM');
                                        const result = await rosterService.cleanupDuplicates(monthPrefix);
                                        alert(`تم تنظيف بيانات شهر ${monthName} بنجاح. تم مسح ${result.deleted} سجل مكرر.`);
                                        window.location.reload();
                                    } catch (error) {
                                        console.error(error);
                                        alert('حدث خطأ أثناء التنظيف.');
                                    }
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all font-bold text-sm shadow-lg shadow-amber-950/20"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>تنظيف البيانات</span>
                        </button>
                        <Link
                            href="/dashboard/admin/roster/grid"
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold text-sm shadow-lg shadow-slate-950/20"
                        >
                            <Maximize2 className="w-4 h-4" />
                            <span>فتح الجدول</span>
                        </Link>
                    </div>
                }
            />

            <div className="bg-white rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-black text-slate-800">
                            {format(currentDate, 'MMMM yyyy', { locale: ar })}
                        </h2>
                        <div className="flex items-center bg-white border border-border rounded-2xl shadow-sm overflow-hidden no-print">
                            <button
                                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                                className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors border-l border-border"
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

                <div className="p-6 relative min-h-[400px]">
                    {isLoading && (
                        <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="grid grid-cols-7 gap-px border-b border-border mb-4">
                            {['أحد', 'ثنين', 'ثاء', 'ربعاء', 'خميس', 'جمعة', 'سبت'].map(day => (
                                <div key={day} className="py-2 text-center text-[10px] font-black text-slate-400 uppercase">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {paddingDays.map(i => (
                                <div key={`padding-${i}`} className="min-h-[120px] bg-slate-50/30 rounded-2xl" />
                            ))}
                            {days.map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const dayRosters = rosters.filter(r => r.date === dateStr);
                                const isToday = isSameDay(day, new Date());

                                return (
                                    <div
                                        key={day.toString()}
                                        onClick={() => setSelectedDay(day)}
                                        className={cn(
                                            "min-h-[120px] p-3 rounded-2xl border transition-all cursor-pointer group relative",
                                            isToday ? "bg-primary/5 border-primary/20" : "bg-white border-slate-100 hover:border-primary/20 hover:shadow-sm"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={cn(
                                                "w-7 h-7 flex items-center justify-center rounded-full text-xs font-black transition-colors",
                                                isToday ? "bg-primary text-white" : "text-slate-400 group-hover:text-primary"
                                            )}>
                                                {format(day, 'd')}
                                            </span>
                                            {!isLocked && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenAssignmentModal(day);
                                                    }}
                                                    className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            {dayRosters.slice(0, 3).map(r => {
                                                const doc = doctors.find(d => d.fingerprintCode === r.doctorId);
                                                return (
                                                    <div key={r.id} className="text-[10px] p-1 bg-slate-50 rounded border border-slate-100 font-bold truncate">
                                                        <span className="text-primary ml-1">{r.shiftCode}</span>
                                                        {doc?.fullNameArabic.split(' ')[0]}
                                                    </div>
                                                );
                                            })}
                                            {dayRosters.length > 3 && (
                                                <div className="text-[9px] font-black text-slate-400 text-center">
                                                    +{dayRosters.length - 3} المزيد
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Day Details Modal */}
            {selectedDay && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 bg-slate-50 border-b border-border flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">تفاصيل مناوبات اليوم</h3>
                                <p className="text-sm font-bold text-slate-500 mt-1">{format(selectedDay, 'EEEE, d MMMM yyyy', { locale: ar })}</p>
                            </div>
                            <button onClick={() => setSelectedDay(null)} className="p-2 hover:bg-white rounded-xl transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto">
                            <table className="w-full text-right">
                                <thead>
                                    <tr className="text-slate-400 text-xs font-black border-b border-border">
                                        <th className="pb-4 px-4">الطبيب</th>
                                        <th className="pb-4 px-4">كود البصمة</th>
                                        <th className="pb-4 px-4">المناوبة</th>
                                        <th className="pb-4 px-4 text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {rosters.filter(r => r.date === format(selectedDay, 'yyyy-MM-dd')).map(r => {
                                        const doc = doctors.find(d => d.fingerprintCode === r.doctorId);
                                        return (
                                            <tr key={r.id}>
                                                <td className="py-4 px-4 font-black">{doc?.fullNameArabic}</td>
                                                <td className="py-4 px-4 font-bold text-slate-500">{r.doctorId}</td>
                                                <td className="py-4 px-4 font-black text-primary">{r.shiftCode}</td>
                                                <td className="py-4 px-4">
                                                    {!isLocked && (
                                                        <div className="flex justify-center gap-2">
                                                            <button onClick={() => handleOpenAssignmentModal(selectedDay, r)} className="p-2 text-slate-400 hover:text-primary transition-colors">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleDeleteAssignment(r.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            {isAssignmentModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
                        <div className="p-8 bg-slate-50 border-b border-border flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900">إضافة/تعديل مناوبة</h3>
                            <button onClick={() => setIsAssignmentModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveAssignment} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-black text-slate-700 block mb-2">الطبيب</label>
                                    <select
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-border font-bold bg-slate-50"
                                        value={currentAssignment?.doctorId || ''}
                                        onChange={e => setCurrentAssignment({ ...currentAssignment, doctorId: e.target.value })}
                                    >
                                        <option value="">اختر الطبيب...</option>
                                        {doctors.map(d => (
                                            <option key={d.fingerprintCode} value={d.fingerprintCode}>{d.fullNameArabic}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-700 block mb-2">المناوبة</label>
                                    <select
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-border font-bold bg-slate-50"
                                        value={currentAssignment?.shiftCode || ''}
                                        onChange={e => setCurrentAssignment({ ...currentAssignment, shiftCode: e.target.value })}
                                    >
                                        <option value="">اختر المناوبة...</option>
                                        {shiftTypes.map(s => (
                                            <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full py-4 rounded-2xl bg-primary text-white font-black shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                                <Save className="w-5 h-5" />
                                حفظ البيانات
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
