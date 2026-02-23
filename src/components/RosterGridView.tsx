'use client';

import React, { useMemo, useState } from 'react';
import { Doctor, RosterRecord, ShiftType } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
    ChevronRight,
    ChevronLeft,
    Search,
    User,
    Briefcase,
    Calendar as CalendarIcon,
    Loader2,
    Save,
    Trash2,
    Plus,
    X
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
    const [editingCell, setEditingCell] = useState<{ doctorId: string; date: string } | null>(null);
    const [savingCell, setSavingCell] = useState<string | null>(null);

    const daysCount = getDaysInMonth(currentDate);
    const monthStart = startOfMonth(currentDate);
    const days = Array.from({ length: daysCount }, (_, i) => {
        const date = addDays(monthStart, i);
        return {
            date: format(date, 'yyyy-MM-dd'),
            dayNumber: i + 1,
            dayName: format(date, 'EEEE', { locale: ar }),
            isWeekend: format(date, 'i') === '5' || format(date, 'i') === '6', // Fri, Sat
        };
    });

    const filteredDoctors = useMemo(() => {
        return doctors.filter(d =>
            d.fullNameArabic.includes(searchTerm) ||
            d.specialty.includes(searchTerm) ||
            d.fingerprintCode.includes(searchTerm)
        ).sort((a, b) => a.classificationRank - b.classificationRank);
    }, [doctors, searchTerm]);

    const getRosterForCell = (doctorId: string, date: string) => {
        return rosters.filter(r => r.doctorId === doctorId && r.date === date);
    };

    const handleCellClick = (doctorId: string, date: string) => {
        setEditingCell({ doctorId, date });
    };

    const handleSelectShift = async (doctorId: string, date: string, shiftCode: string | null) => {
        const cellKey = `${doctorId}_${date}`;
        setSavingCell(cellKey);

        try {
            const existing = getRosterForCell(doctorId, date);

            if (shiftCode) {
                // If there's an existing shift, update it, otherwise create new
                // For simplicity in grid, we manage one shift per cell per doctor
                const assignment: Partial<RosterRecord> = {
                    ...(existing.length > 0 ? { id: existing[0].id } : {}),
                    doctorId,
                    date,
                    shiftCode,
                    source: 'ManualEdit'
                };
                await onSaveAssignment(assignment);
            } else if (existing.length > 0) {
                // Delete if "None" selected
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
        <div className="bg-white rounded-3xl border border-border shadow-sm flex flex-col h-[70vh] overflow-hidden">
            {/* Grid Toolbar */}
            <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 bg-slate-50/50">
                <div className="relative flex-1">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                        type="text"
                        placeholder="البحث عن طبيب بالاسم أو الكود..."
                        className="w-full pr-10 pl-4 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-blue-100 rounded border border-blue-200" />
                        <span>صباحي</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-indigo-100 rounded border border-indigo-200" />
                        <span>مسائي</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-amber-100 rounded border border-amber-200" />
                        <span>24 ساعة</span>
                    </div>
                </div>
            </div>

            {/* Grid Table Container */}
            <div className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-slate-200">
                <table className="border-separate border-spacing-0 w-full text-right">
                    <thead className="sticky top-0 z-20">
                        <tr>
                            {/* Sticky Top-Left Corner */}
                            <th className="sticky left-0 right-0 z-30 bg-slate-100 border-b border-l border-slate-200 p-4 min-w-[200px] text-xs font-black text-slate-500 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                الطبيب / التاريخ
                            </th>
                            {days.map(day => (
                                <th
                                    key={day.date}
                                    className={cn(
                                        "bg-slate-50 border-b border-l border-slate-200 p-2 min-w-[50px] text-center transition-colors",
                                        day.isWeekend && "bg-slate-100"
                                    )}
                                >
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] uppercase text-slate-400 font-bold">{day.dayName.substring(0, 3)}</span>
                                        <span className="text-sm font-black text-slate-700">{day.dayNumber}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDoctors.map(doctor => (
                            <tr key={doctor.fingerprintCode} className="hover:bg-slate-50/30">
                                {/* Sticky Name Column */}
                                <td className="sticky left-0 right-0 z-10 bg-white border-b border-l border-slate-200 p-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-slate-900 line-clamp-1">{doctor.fullNameArabic}</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-slate-400 font-bold">{doctor.fingerprintCode}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-bold">{doctor.specialty}</span>
                                        </div>
                                    </div>
                                </td>

                                {days.map(day => {
                                    const cellRosters = getRosterForCell(doctor.fingerprintCode, day.date);
                                    const cellAssignment = cellRosters[0];
                                    const isEditing = editingCell?.doctorId === doctor.fingerprintCode && editingCell?.date === day.date;
                                    const isSaving = savingCell === `${doctor.fingerprintCode}_${day.date}`;

                                    // Visual indicators based on shift type
                                    const isMorning = cellAssignment?.shiftCode.includes('M') || cellAssignment?.shiftCode === '7M';
                                    const isEvening = cellAssignment?.shiftCode.includes('E') || cellAssignment?.shiftCode === '17E';
                                    const is24H = cellAssignment?.shiftCode.includes('24H');

                                    return (
                                        <td
                                            key={`${doctor.fingerprintCode}_${day.date}`}
                                            className={cn(
                                                "border-b border-l border-slate-100 p-0 text-center relative h-12 cursor-pointer transition-all hover:bg-slate-50/50",
                                                day.isWeekend && "bg-slate-50/30",
                                                isEditing && "bg-primary/5 ring-2 ring-primary ring-inset z-10"
                                            )}
                                            onClick={() => handleCellClick(doctor.fingerprintCode, day.date)}
                                        >
                                            {isSaving ? (
                                                <Loader2 className="w-4 h-4 text-primary animate-spin mx-auto" />
                                            ) : isEditing ? (
                                                <div className="absolute top-0 right-0 w-max min-w-[120px] bg-white shadow-2xl rounded-xl border border-primary/20 p-2 z-50 animate-in fade-in zoom-in-95 pointer-events-auto">
                                                    <div className="flex flex-col gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleSelectShift(doctor.fingerprintCode, day.date, null); }}
                                                            className="text-right px-3 py-1.5 rounded-lg hover:bg-slate-50 text-[10px] font-bold text-rose-500 border border-transparent hover:border-rose-100"
                                                        >
                                                            حذف المناوبة
                                                        </button>
                                                        {shiftTypes.map(st => (
                                                            <button
                                                                key={st.code}
                                                                onClick={(e) => { e.stopPropagation(); handleSelectShift(doctor.fingerprintCode, day.date, st.code); }}
                                                                className={cn(
                                                                    "text-right px-3 py-1.5 rounded-lg hover:bg-slate-50 text-[10px] font-black border border-transparent transition-all",
                                                                    cellAssignment?.shiftCode === st.code ? "bg-primary/10 border-primary/20 text-primary" : "text-slate-600"
                                                                )}
                                                            >
                                                                {st.name} ({st.code})
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : cellAssignment ? (
                                                <div className={cn(
                                                    "w-full h-full flex items-center justify-center font-black text-[10px] transition-transform active:scale-95",
                                                    is24H ? "bg-amber-100 text-amber-700" :
                                                        isMorning ? "bg-blue-100 text-blue-700" :
                                                            isEvening ? "bg-indigo-100 text-indigo-700" :
                                                                "bg-slate-100 text-slate-800"
                                                )}>
                                                    {cellAssignment.shiftCode}
                                                </div>
                                            ) : (
                                                <div className="opacity-0 hover:opacity-100 flex items-center justify-center h-full">
                                                    <Plus className="w-3 h-3 text-slate-300" />
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer with counts */}
            <div className="p-4 border-t border-border bg-slate-50 flex items-center justify-between no-print">
                <span className="text-xs font-bold text-slate-500">
                    عدد الأطباء المعروضين: {filteredDoctors.length}
                </span>
                <span className="text-xs font-bold text-slate-400 italic">
                    * اضغط على الخلية لتعديل المناوبة فوراً
                </span>
            </div>
        </div>
    );
}
