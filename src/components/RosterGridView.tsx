'use client';

import React, { useMemo, useState, useCallback, memo } from 'react';
import { Doctor, RosterRecord, ShiftType } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
    Search,
    Loader2,
    Plus,
    Filter,
    Users,
    ChevronDown,
    ChevronUp,
    Check
} from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';

// Fixed order for departments as per the "Operational Schedule" (الجدول التشغيلي)
const DEPARTMENT_ORDER = [
    'الجراحة العامة',
    'جراحة العظام',
    'جراحة المسالك البولية',
    'جراحة المخ والأعصاب',
    'جراحة التجميل',
    'جراحة أوعية دموية',
    'جراحة أطفال',
    'جراحة القلب والصدر',
    'جراحة الوجه والفكين',
    'النساء والتوليد',
    'التخدير',
    'العناية المركزة',
    'رعاية حرجة',
    'الحضانات',
    'الطوارئ',
    'الباطنة العامة',
    'الأطفال',
    'القلب',
    'الجهاز الهضمي',
    'الأمراض الصدرية',
    'غسيل كلوى',
    'الكلى',
    'الروماتيزم',
    'الجلدية',
    'طب وجراحة العيون',
    'الأنف والأذن والحنجرة',
    'الأشعة التشخيصية',
    'بنك الدم',
    'الباثولوجيا الإكلينيكية',
    'المعمل',
    'الصيدلية'
];

interface RosterGridViewProps {
    currentDate: Date;
    doctors: Doctor[];
    rosters: RosterRecord[];
    shiftTypes: ShiftType[];
    onSaveAssignment: (assignment: Partial<RosterRecord>) => Promise<void>;
    onDeleteAssignment: (id: string) => Promise<void>;
    isLoading?: boolean;
}

// --- OPTIMIZED SUB-COMPONENTS ---

const GridCell = memo(({
    doctor,
    day,
    roster,
    isEditing,
    isSaving,
    onEdit,
    onSaveShift,
    shiftTypes
}: {
    doctor: Doctor;
    day: any;
    roster?: RosterRecord;
    isEditing: boolean;
    isSaving: boolean;
    onEdit: () => void;
    onSaveShift: (shiftCode: string | null) => void;
    shiftTypes: ShiftType[];
}) => {
    // Determine visuals based on shift code
    const isMorning = roster?.shiftCode.includes('M') || roster?.shiftCode === '7M';
    const isEvening = roster?.shiftCode.includes('E') || roster?.shiftCode === '17E';
    const is24H = roster?.shiftCode.includes('24H');

    return (
        <td
            className={cn(
                "border-b border-l border-slate-100 p-0 text-center relative h-12 cursor-pointer transition-all",
                day.isWeekend && "bg-slate-50/30",
                isEditing ? "bg-primary/10 ring-2 ring-primary ring-inset z-40 shadow-inner" : "hover:bg-primary/5"
            )}
            onClick={onEdit}
        >
            {isSaving ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin mx-auto" />
            ) : isEditing ? (
                <div className="absolute top-0 right-0 w-max min-w-[150px] bg-white shadow-2xl rounded-2xl border border-primary/30 p-2 z-[60] animate-in fade-in zoom-in-95 pointer-events-auto shadow-primary/20">
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); onSaveShift(null); }}
                            className="text-right px-3 py-2.5 rounded-xl hover:bg-rose-50 text-[11px] font-black text-rose-500 transition-colors"
                        >
                            حذف المناوبة
                        </button>
                        <div className="h-px bg-slate-100 mx-1" />
                        {shiftTypes.map(st => (
                            <button
                                key={st.code}
                                onClick={(e) => { e.stopPropagation(); onSaveShift(st.code); }}
                                className={cn(
                                    "text-right px-3 py-2 rounded-xl hover:bg-slate-50 text-[11px] font-black transition-all flex items-center justify-between",
                                    roster?.shiftCode === st.code ? "bg-primary/10 text-primary" : "text-slate-600"
                                )}
                            >
                                <span>{st.name}</span>
                                {roster?.shiftCode === st.code && <Check className="w-3 h-3" />}
                            </button>
                        ))}
                    </div>
                </div>
            ) : roster ? (
                <div className={cn(
                    "w-full h-full flex items-center justify-center font-black text-[11px] transition-all",
                    is24H ? "bg-amber-100 text-amber-700" :
                        isMorning ? "bg-blue-50 text-blue-600" :
                            isEvening ? "bg-indigo-50 text-indigo-600" :
                                "bg-slate-100 text-slate-800"
                )}>
                    {roster.shiftCode}
                </div>
            ) : (
                <div className="opacity-0 hover:opacity-100 flex items-center justify-center h-full transition-opacity group">
                    <Plus className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary/50" />
                </div>
            )}
        </td>
    );
}, (prev, next) => {
    return prev.roster?.shiftCode === next.roster?.shiftCode &&
        prev.isEditing === next.isEditing &&
        prev.isSaving === next.isSaving &&
        prev.day.date === next.day.date &&
        prev.doctor.fingerprintCode === next.doctor.fingerprintCode;
});

GridCell.displayName = 'GridCell';

// --- MAIN COMPONENT ---

export function RosterGridView({
    currentDate,
    doctors,
    rosters,
    shiftTypes,
    onSaveAssignment,
    onDeleteAssignment,
    isLoading = false
}: RosterGridViewProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyActive, setShowOnlyActive] = useState(true);
    const [editingCell, setEditingCell] = useState<{ doctorId: string; date: string } | null>(null);
    const [savingCell, setSavingCell] = useState<string | null>(null);

    const daysCount = getDaysInMonth(currentDate);
    const monthStart = startOfMonth(currentDate);
    const days = useMemo(() => Array.from({ length: daysCount }, (_, i) => {
        const date = addDays(monthStart, i);
        return {
            date: format(date, 'yyyy-MM-dd'),
            dayNumber: i + 1,
            dayName: format(date, 'EEEE', { locale: ar }),
            isWeekend: format(date, 'i') === '5' || format(date, 'i') === '6', // Fri, Sat
        };
    }), [currentDate, monthStart, daysCount]);

    const activeRosterMap = useMemo(() => {
        const map = new Map<string, RosterRecord>();
        rosters.forEach(r => {
            map.set(`${r.doctorId}_${r.date}`, r);
        });
        return map;
    }, [rosters]);

    const processedData = useMemo(() => {
        const activeDoctorIdsWithShifts = new Set(rosters.map(r => r.doctorId));

        let filtered = doctors.filter(d => {
            const matchesSearch = d.fullNameArabic.includes(searchTerm) ||
                (d.specialty && d.specialty.includes(searchTerm)) ||
                d.fingerprintCode.includes(searchTerm);

            if (showOnlyActive) return matchesSearch && activeDoctorIdsWithShifts.has(d.fingerprintCode);
            return matchesSearch;
        });

        const groups: Record<string, Doctor[]> = {};
        filtered.forEach(doc => {
            const dept = doc.specialty || doc.department || 'عام';
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(doc);
        });

        const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
            const indexA = DEPARTMENT_ORDER.indexOf(a);
            const indexB = DEPARTMENT_ORDER.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b, 'ar');
        });

        deptDoctorsList: for (let group of sortedGroups) {
            group[1].sort((a, b) => a.classificationRank - b.classificationRank);
        }

        return {
            groups: sortedGroups,
            activeCount: activeDoctorIdsWithShifts.size,
            totalDisplayed: filtered.length
        };
    }, [doctors, rosters, searchTerm, showOnlyActive]);

    const handleCellAction = useCallback(async (doctorId: string, date: string, shiftCode: string | null) => {
        const cellKey = `${doctorId}_${date}`;
        setSavingCell(cellKey);

        try {
            const existing = activeRosterMap.get(cellKey);
            if (shiftCode) {
                await onSaveAssignment({
                    ...(existing ? { id: existing.id } : {}),
                    doctorId,
                    date,
                    shiftCode,
                    source: 'ManualEdit'
                });
            } else if (existing) {
                await onDeleteAssignment(existing.id!);
            }
        } catch (error) {
            console.error("Failed grid update", error);
        } finally {
            setSavingCell(null);
            setEditingCell(null);
        }
    }, [activeRosterMap, onSaveAssignment, onDeleteAssignment]);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50/50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-slate-400 font-black animate-pulse">جاري تحميل البيانات الذكية...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white flex flex-col h-full overflow-hidden">
            {/* Professional Grid Toolbar */}
            <div className="p-4 border-b border-border flex flex-col lg:flex-row items-center gap-4 bg-white z-50">
                <div className="relative flex-1 w-full">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="البحث الذكي عن طبيب أو قسم..."
                        className="w-full pr-11 pl-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-primary/5 bg-slate-50/50 font-bold text-sm transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                    <button
                        onClick={() => setShowOnlyActive(!showOnlyActive)}
                        className={cn(
                            "flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all border shrink-0 shadow-sm",
                            showOnlyActive
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-slate-600 border-slate-200"
                        )}
                    >
                        <Filter className="w-4 h-4" />
                        <span>{showOnlyActive ? 'عرض المكلفين فقط' : 'عرض الجميع'}</span>
                    </button>

                    <div className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm italic text-[11px] font-bold text-primary">
                        التمرير جانبي لمشاهدة باقي أيام الشهر
                    </div>
                </div>
            </div>

            {/* High Performance Scrollable Grid */}
            <div className="flex-1 overflow-auto relative overscroll-none scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <table className="border-separate border-spacing-0 w-full text-right table-fixed min-w-max">
                    <thead className="sticky top-0 z-40">
                        <tr className="shadow-sm">
                            <th className="sticky left-0 z-50 bg-slate-100/95 backdrop-blur-md border-b-2 border-l border-slate-200 p-3 w-[180px] text-xs font-black text-slate-600">
                                <div className="flex items-center justify-between">
                                    <span>الكادر الطبي</span>
                                    <Users className="w-4 h-4 opacity-30" />
                                </div>
                            </th>
                            {days.map(day => (
                                <th
                                    key={day.date}
                                    className={cn(
                                        "bg-slate-50/95 backdrop-blur-md border-b-2 border-l border-slate-200 p-1 w-[42px] text-center transition-colors",
                                        day.isWeekend && "bg-rose-50/80"
                                    )}
                                >
                                    <div className="flex flex-col items-center">
                                        <span className={cn(
                                            "text-[8px] uppercase font-black tracking-tighter",
                                            day.isWeekend ? "text-rose-400" : "text-slate-400"
                                        )}>{day.dayName.substring(0, 3)}</span>
                                        <span className={cn(
                                            "text-sm font-black",
                                            day.isWeekend ? "text-rose-700" : "text-slate-800"
                                        )}>{day.dayNumber}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {processedData.groups.map(([dept, deptDoctors]) => (
                            <React.Fragment key={dept}>
                                <tr className="sticky z-30" style={{ top: '56px' }}>
                                    <td
                                        colSpan={days.length + 1}
                                        className="py-2.5 px-4 text-xs font-black text-slate-700 border-b border-slate-200 bg-slate-50 sticky left-0 right-0 shadow-sm"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-4 bg-primary rounded-full shadow-sm shadow-primary/30" />
                                            <span>{dept}</span>
                                            <span className="text-[9px] bg-white/50 px-2 py-0.5 rounded-full border border-slate-300/50 text-slate-500 mr-2 font-bold">
                                                {deptDoctors.length} طبيب
                                            </span>
                                        </div>
                                    </td>
                                </tr>

                                {deptDoctors.map(doctor => (
                                    <tr key={doctor.fingerprintCode} className="hover:bg-primary/5 transition-colors group">
                                        <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50/80 border-b border-l border-slate-200 p-2 shadow-[2px_0_15px_-4px_rgba(0,0,0,0.08)] transition-all">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-black text-slate-900 line-clamp-1">{doctor.fullNameArabic}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 rounded-lg text-slate-600 font-bold border border-slate-200 whitespace-nowrap">
                                                        {doctor.classification}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-medium tracking-tight">#{doctor.fingerprintCode}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {days.map(day => {
                                            const cellKey = `${doctor.fingerprintCode}_${day.date}`;
                                            const roster = activeRosterMap.get(cellKey);
                                            const isEditing = editingCell?.doctorId === doctor.fingerprintCode && editingCell?.date === day.date;
                                            const isSaving = savingCell === cellKey;

                                            return (
                                                <GridCell
                                                    key={cellKey}
                                                    doctor={doctor}
                                                    day={day}
                                                    roster={roster}
                                                    isEditing={isEditing}
                                                    isSaving={isSaving}
                                                    shiftTypes={shiftTypes}
                                                    onEdit={() => setEditingCell({ doctorId: doctor.fingerprintCode, date: day.date })}
                                                    onSaveShift={(code) => handleCellAction(doctor.fingerprintCode, day.date, code)}
                                                />
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Optimized Legend Footer */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 z-50 relative shadow-[0_-4px_15px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-[11px] font-black text-slate-600">
                            المعروض: {processedData.totalDisplayed} طبيب
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {shiftTypes.slice(0, 4).map(st => (
                        <div key={st.code} className="flex items-center gap-2">
                            <div className={cn(
                                "w-2.5 h-2.5 rounded-full",
                                st.code.includes('M') ? "bg-blue-400" :
                                    st.code.includes('E') ? "bg-indigo-400" :
                                        "bg-amber-400"
                            )} />
                            <span className="text-[10px] font-black text-slate-500">{st.code}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
