'use client';

import React, { useMemo, useState } from 'react';
import { Doctor, RosterRecord, ShiftType } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
    Search,
    Loader2,
    Plus,
    Filter,
    Users,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';

interface RosterGridViewProps {
    currentDate: Date;
    doctors: Doctor[];
    rosters: RosterRecord[];
    shiftTypes: ShiftType[];
    onSaveAssignment: (assignment: Partial<RosterRecord>) => Promise<void>;
    onDeleteAssignment: (id: string) => Promise<void>;
    isLoading?: boolean;
}

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

    const processedData = useMemo(() => {
        // 1. Identify doctors with shifts in this month
        const activeDoctorIds = new Set(rosters.map(r => r.doctorId));

        // 2. Filter doctors
        let filtered = doctors.filter(d => {
            const matchesSearch = d.fullNameArabic.includes(searchTerm) ||
                d.specialty.includes(searchTerm) ||
                d.fingerprintCode.includes(searchTerm);
            const isActive = activeDoctorIds.has(d.fingerprintCode);

            if (showOnlyActive) return matchesSearch && isActive;
            return matchesSearch;
        });

        // 3. Group by Department/Specialty
        const groups: Record<string, Doctor[]> = {};
        filtered.forEach(doc => {
            const dept = doc.specialty || 'عام';
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(doc);
        });

        // 4. Sort doctors within groups by classification rank
        Object.keys(groups).forEach(dept => {
            groups[dept].sort((a, b) => a.classificationRank - b.classificationRank);
        });

        return {
            groups: Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'ar')),
            activeCount: activeDoctorIds.size,
            totalDisplayed: filtered.length
        };
    }, [doctors, rosters, searchTerm, showOnlyActive]);

    const getRosterForCell = (doctorId: string, date: string) => {
        return rosters.filter(r => r.doctorId === doctorId && r.date === date);
    };

    const handleSelectShift = async (doctorId: string, date: string, shiftCode: string | null) => {
        const cellKey = `${doctorId}_${date}`;
        setSavingCell(cellKey);

        try {
            const existing = getRosterForCell(doctorId, date);
            if (shiftCode) {
                const assignment: Partial<RosterRecord> = {
                    ...(existing.length > 0 ? { id: existing[0].id } : {}),
                    doctorId,
                    date,
                    shiftCode,
                    source: 'ManualEdit'
                };
                await onSaveAssignment(assignment);
            } else if (existing.length > 0) {
                await onDeleteAssignment(existing[0].id!);
            }
        } catch (error) {
            console.error("Failed to save grid update", error);
        } finally {
            setSavingCell(null);
            setEditingCell(null);
        }
    };

    if (isLoading) {
        return (
            <div className="h-96 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2rem] border border-border shadow-md flex flex-col h-[75vh] overflow-hidden border-t-4 border-t-primary">
            {/* Professional Grid Toolbar */}
            <div className="p-4 border-b border-border flex flex-col lg:flex-row items-center gap-4 bg-slate-50/80 backdrop-blur-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="البحث عن طبيب أو قسم أو كود..."
                        className="w-full pr-11 pl-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/5 bg-white font-bold text-sm transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto shrink-0">
                    <button
                        onClick={() => setShowOnlyActive(!showOnlyActive)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all border shrink-0",
                            showOnlyActive
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        )}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        <span>{showOnlyActive ? 'عرض المكلفين فقط' : 'عرض جميع الأطباء'}</span>
                    </button>

                    <div className="h-8 w-px bg-slate-200 hidden lg:block" />

                    <div className="flex items-center gap-3">
                        {shiftTypes.map(st => (
                            <div key={st.code} className="flex items-center gap-1.5 shrink-0">
                                <div className={cn(
                                    "w-3 h-3 rounded-full border shadow-sm",
                                    st.code.includes('M') ? "bg-blue-400 border-blue-500" :
                                        st.code.includes('E') ? "bg-indigo-400 border-indigo-500" :
                                            "bg-amber-400 border-amber-500"
                                )} />
                                <span className="text-[10px] font-black text-slate-500">{st.code}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Interactive Grid Container */}
            <div className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-slate-200 scroll-smooth">
                <table className="border-separate border-spacing-0 w-full text-right table-fixed">
                    <thead className="sticky top-0 z-30 shadow-sm">
                        <tr>
                            {/* Sticky Top-Left Corner */}
                            <th className="sticky left-0 z-40 bg-slate-100/95 backdrop-blur-md border-b border-l border-slate-200 p-4 w-[250px] min-w-[250px] text-xs font-black text-slate-600">
                                الكادر الطبي / الأيام
                            </th>
                            {days.map(day => (
                                <th
                                    key={day.date}
                                    className={cn(
                                        "bg-slate-50/95 backdrop-blur-md border-b border-l border-slate-200 p-2 w-[55px] min-w-[55px] text-center transition-colors shrink-0",
                                        day.isWeekend && "bg-rose-50/80"
                                    )}
                                >
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className={cn(
                                            "text-[9px] uppercase font-black",
                                            day.isWeekend ? "text-rose-400" : "text-slate-400"
                                        )}>{day.dayName.substring(0, 3)}</span>
                                        <span className={cn(
                                            "text-sm font-black",
                                            day.isWeekend ? "text-rose-600" : "text-slate-700"
                                        )}>{day.dayNumber}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {processedData.groups.map(([dept, deptDoctors]) => (
                            <React.Fragment key={dept}>
                                {/* Department Section Header */}
                                <tr className="bg-slate-200/50 sticky z-20" style={{ top: '53px' }}>
                                    <td
                                        colSpan={days.length + 1}
                                        className="py-2.5 px-4 text-xs font-black text-slate-700 border-b border-slate-200 bg-slate-100/90 backdrop-blur-sm sticky left-0 right-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-4 bg-primary rounded-full" />
                                            <span>قسم {dept}</span>
                                            <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-500 mr-2 font-bold">
                                                {deptDoctors.length} طبيب
                                            </span>
                                        </div>
                                    </td>
                                </tr>

                                {deptDoctors.map(doctor => (
                                    <tr key={doctor.fingerprintCode} className="hover:bg-primary/5 transition-colors group">
                                        {/* Sticky Doctor Name & Meta Column */}
                                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-b border-l border-slate-200 p-3 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.05)] transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 line-clamp-1">{doctor.fullNameArabic}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 rounded-lg text-slate-500 font-bold border border-slate-200 group-hover:bg-white">
                                                        {doctor.classification}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono tracking-tighter">ID: {doctor.fingerprintCode}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {days.map(day => {
                                            const cellRosters = getRosterForCell(doctor.fingerprintCode, day.date);
                                            const cellAssignment = cellRosters[0];
                                            const isEditing = editingCell?.doctorId === doctor.fingerprintCode && editingCell?.date === day.date;
                                            const isSaving = savingCell === `${doctor.fingerprintCode}_${day.date}`;

                                            // Enhanced visual logic
                                            const isMorning = cellAssignment?.shiftCode.includes('M') || cellAssignment?.shiftCode === '7M';
                                            const isEvening = cellAssignment?.shiftCode.includes('E') || cellAssignment?.shiftCode === '17E';
                                            const is24H = cellAssignment?.shiftCode.includes('24H');

                                            return (
                                                <td
                                                    key={`${doctor.fingerprintCode}_${day.date}`}
                                                    className={cn(
                                                        "border-b border-l border-slate-50 p-0 text-center relative h-12 cursor-pointer transition-all",
                                                        day.isWeekend && "bg-slate-50/20",
                                                        isEditing ? "bg-primary/5 ring-2 ring-primary ring-inset z-40" : "hover:bg-primary/5"
                                                    )}
                                                    onClick={() => setEditingCell({ doctorId: doctor.fingerprintCode, date: day.date })}
                                                >
                                                    {isSaving ? (
                                                        <Loader2 className="w-4 h-4 text-primary animate-spin mx-auto" />
                                                    ) : isEditing ? (
                                                        <div className="absolute top-0 right-0 w-max min-w-[140px] bg-white shadow-2xl rounded-2xl border border-primary/20 p-2 z-50 animate-in fade-in zoom-in-95 pointer-events-auto">
                                                            <div className="flex flex-col gap-1.5">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleSelectShift(doctor.fingerprintCode, day.date, null); }}
                                                                    className="text-right px-3 py-2 rounded-xl hover:bg-rose-50 text-[11px] font-black text-rose-500 transition-colors border border-transparent"
                                                                >
                                                                    حذف المناوبة
                                                                </button>
                                                                <div className="h-px bg-slate-100 mx-1" />
                                                                {shiftTypes.map(st => (
                                                                    <button
                                                                        key={st.code}
                                                                        onClick={(e) => { e.stopPropagation(); handleSelectShift(doctor.fingerprintCode, day.date, st.code); }}
                                                                        className={cn(
                                                                            "text-right px-3 py-2 rounded-xl hover:bg-slate-50 text-[11px] font-black border border-transparent transition-all flex items-center justify-between",
                                                                            cellAssignment?.shiftCode === st.code ? "bg-primary/10 border-primary/20 text-primary" : "text-slate-600"
                                                                        )}
                                                                    >
                                                                        <span>{st.name}</span>
                                                                        <span className="text-[9px] opacity-60">({st.code})</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : cellAssignment ? (
                                                        <div className={cn(
                                                            "w-full h-full flex items-center justify-center font-black text-[10px] transition-all transform active:scale-90",
                                                            is24H ? "bg-amber-100 text-amber-700 border-x border-amber-200/50" :
                                                                isMorning ? "bg-blue-50 text-blue-600 border-x border-blue-100" :
                                                                    isEvening ? "bg-indigo-50 text-indigo-600 border-x border-indigo-100" :
                                                                        "bg-slate-100 text-slate-800"
                                                        )}>
                                                            {cellAssignment.shiftCode}
                                                        </div>
                                                    ) : (
                                                        <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-full transition-opacity">
                                                            <Plus className="w-3.5 h-3.5 text-primary/30" />
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Professional Footer Info */}
            <div className="px-6 py-4 border-t border-border bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 no-print shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-black text-slate-600">
                            العدد الإجمالي المعروض: {processedData.totalDisplayed} طبيب
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-black text-slate-600">
                            عدد المكلفين: {processedData.activeCount}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 italic">
                    <div className="p-1.5 bg-blue-100 rounded-lg text-blue-700 shadow-sm">
                        تلميح: اضغط على أي خلية لتعديل الجدول فوراً.
                    </div>
                </div>
            </div>
        </div>
    );
}
