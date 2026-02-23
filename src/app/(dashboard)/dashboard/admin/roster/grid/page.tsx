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
    const [isFullScreen, setIsFullScreen] = useState(true);

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
            "transition-all duration-500 bg-white overflow-hidden",
            isFullScreen ? "fixed inset-0 z-[200] flex flex-col w-screen h-screen" : "space-y-4"
        )}>
            {!isFullScreen && (
                <div className="flex items-center justify-between mb-2">
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
                "flex flex-col flex-1",
                isFullScreen ? "h-full" : "h-[85vh] border border-slate-200 shadow-xl overflow-hidden"
            )}>
                {isFullScreen && (
                    <div className="flex items-center justify-between p-4 bg-slate-900 text-white shrink-0">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-black">
                                إدارة الجدول - {format(currentDate, 'MMMM yyyy', { locale: ar })}
                            </h2>
                        </div>
                        <button
                            onClick={() => setIsFullScreen(false)}
                            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-all"
                        >
                            <Minimize2 className="w-5 h-5" />
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-hidden">
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
