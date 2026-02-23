'use client';

import React, { useState, useEffect } from 'react';
import { RosterGridView } from '@/components/RosterGridView';
import { PageHeader } from '@/components/PageHeader';
import { Doctor, RosterRecord, ShiftType } from '@/lib/types';
import { rosterService, doctorService, shiftService } from '@/lib/firebase-service';
import { mockShiftTypes } from '@/lib/mockData';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ArrowLeft, Maximize2, Minimize2, Save, Download } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function RosterGridPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [rosters, setRosters] = useState<RosterRecord[]>([]);
    const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
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
                console.error("Error loading grid data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [currentDate]);

    const handleSaveAssignment = async (assignment: Partial<RosterRecord>) => {
        try {
            await rosterService.save(assignment as RosterRecord);
            const monthFilter = format(currentDate, 'yyyy-MM');
            const updatedRosters = await rosterService.getByMonth(monthFilter);
            setRosters(updatedRosters);
        } catch (error) {
            console.error("Failed to save roster from grid", error);
            throw error;
        }
    };

    const handleDeleteAssignment = async (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذا التكليف؟')) {
            try {
                await rosterService.delete(id);
                setRosters(rosters.filter(r => r.id !== id));
            } catch (error) {
                console.error("Failed to delete", error);
            }
        }
    };

    return (
        <div className={cn(
            "space-y-6 transition-all duration-500",
            isFullScreen ? "fixed inset-0 z-[200] bg-slate-50 p-6 overflow-auto" : ""
        )}>
            {!isFullScreen && (
                <div className="flex items-center justify-between mb-4">
                    <Link
                        href="/dashboard/admin/roster"
                        className="flex items-center gap-2 text-slate-500 hover:text-primary transition-all font-bold text-sm bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        العودة للتقويم
                    </Link>

                    <button
                        onClick={() => setIsFullScreen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-bold text-sm shadow-sm"
                    >
                        <Maximize2 className="w-4 h-4" />
                        ملء الشاشة
                    </button>
                </div>
            )}

            <div className={cn(
                "flex flex-col gap-4",
                isFullScreen ? "h-full" : ""
            )}>
                {isFullScreen && (
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-black text-slate-800">
                                إدارة الجدول المجمع - {format(currentDate, 'MMMM yyyy', { locale: ar })}
                            </h2>
                        </div>
                        <button
                            onClick={() => setIsFullScreen(false)}
                            className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg"
                        >
                            <Minimize2 className="w-5 h-5" />
                        </button>
                    </div>
                )}

                <div className={cn(
                    "bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden",
                    isFullScreen ? "flex-1" : "min-h-[700px]"
                )}>
                    <RosterGridView
                        currentDate={currentDate}
                        doctors={doctors}
                        rosters={rosters}
                        shiftTypes={shiftTypes}
                        onSaveAssignment={handleSaveAssignment}
                        onDeleteAssignment={handleDeleteAssignment}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </div>
    );
}
