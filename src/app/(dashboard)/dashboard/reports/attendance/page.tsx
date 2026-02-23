'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
    Clock,
    Download,
    Calendar as CalendarIcon,
    Search,
    Stethoscope,
    User,
    Filter,
    ArrowLeftRight,
    Loader2
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { forceDownloadExcel } from '@/lib/excel-utils';
import { doctorService, rosterService, shiftService } from '@/lib/firebase-service';
import { Doctor, RosterRecord, ShiftType } from '@/lib/types';

export default function AttendancePage() {
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('All');

    const [isLoading, setIsLoading] = useState(true);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [rosters, setRosters] = useState<RosterRecord[]>([]);
    const [shifts, setShifts] = useState<ShiftType[]>([]);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Fetch all relevant data
                // We fetch all doctors and shifts once
                // Rosters are filtered by the month of start/end dates
                // For simplicity and accuracy over range, we fetch monthly rosters for the months involved
                const startMonth = startDate.substring(0, 7); // YYYY-MM
                const endMonth = endDate.substring(0, 7);

                // Get all doctors, shifts, and rosters for the range
                // Note: rosterService.getByMonth fetches by prefix. 
                // To be robust across month boundaries, we could fetch all or improve service
                // Given the app scale, fetching monthly increments is fine.
                const months = new Set([startMonth, endMonth]);

                const [docsData, rostersDataArray, shiftsData] = await Promise.all([
                    doctorService.getAll(),
                    Promise.all(Array.from(months).map(m => rosterService.getByMonth(m))),
                    shiftService.getAll()
                ]);

                // Flatten rosters
                const combinedRosters = rostersDataArray.flat();

                setDoctors(docsData);
                setRosters(combinedRosters);
                setShifts(shiftsData);
            } catch (error) {
                console.error("Error loading attendance data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [startDate, endDate]);

    const specialties = useMemo(() => {
        const uniqueSpecs = Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean)));
        return ['All', ...uniqueSpecs];
    }, [doctors]);

    const attendanceData = useMemo(() => {
        const start = startOfDay(parseISO(startDate));
        const end = endOfDay(parseISO(endDate));

        return rosters.filter(record => {
            const recordDate = parseISO(record.date);
            const doctor = doctors.find(d => d.fingerprintCode === record.doctorId);

            const matchesSearch = !searchTerm ||
                doctor?.fullNameArabic.includes(searchTerm) ||
                record.doctorId.includes(searchTerm);

            const matchesSpecialty = selectedSpecialty === 'All' || doctor?.specialty === selectedSpecialty;
            const matchesDate = isWithinInterval(recordDate, { start, end });

            return matchesSearch && matchesSpecialty && matchesDate;
        }).map(record => {
            const doctor = doctors.find(d => d.fingerprintCode === record.doctorId);
            const shift = shifts.find(s => s.code === record.shiftCode);
            return {
                ...record,
                doctor,
                shift
            };
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [startDate, endDate, searchTerm, selectedSpecialty, doctors, rosters, shifts]);

    const handleExport = () => {
        const data = attendanceData.map(r => ({
            'التاريخ': r.date,
            'اسم الطبيب': r.doctor?.fullNameArabic || `طبيب غير مسجل (${r.doctorId})`,
            'كود البصمة': r.doctorId,
            'التخصص': r.doctor?.specialty || '---',
            'كود المناوبة': r.shiftCode,
            'اسم المناوبة': r.shift?.name || '---',
            'المصدر': r.source === 'ExcelUpload' ? 'رفع إكسل' : 'تعديل يدوي'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'سجل الحضور');
        ws['!dir'] = 'rtl';
        forceDownloadExcel(wb, `Attendance_Report_${startDate}_to_${endDate}.xlsx`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <PageHeader
                title="تقرير حضور الكادر الطبي"
                subtitle="سجل تفصيلي للمناوبات التي تم القيام بها في فترة محددة"
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

            <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 mr-2 flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            من تاريخ
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-black text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 mr-2 flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            إلى تاريخ
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-black text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 mr-2 flex items-center gap-1">
                            <Filter className="w-3 h-3" />
                            التخصص
                        </label>
                        <select
                            value={selectedSpecialty}
                            onChange={(e) => setSelectedSpecialty(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-black text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                        >
                            {specialties.map(s => (
                                <option key={s} value={s}>{s === 'All' ? 'جميع التخصصات' : s}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 mr-2 flex items-center gap-1">
                            <Search className="w-3 h-3" />
                            بحث سريع
                        </label>
                        <input
                            type="text"
                            placeholder="الاسم أو الكود..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-black text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>
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
                                    <th className="py-5 px-8 font-black text-slate-500 text-xs uppercase tracking-widest whitespace-nowrap">التاريخ</th>
                                    <th className="py-5 px-8 font-black text-slate-500 text-xs uppercase tracking-widest">الطبيب</th>
                                    <th className="py-5 px-8 font-black text-slate-500 text-xs uppercase tracking-widest">المناوبة</th>
                                    <th className="py-5 px-8 font-black text-slate-500 text-xs uppercase tracking-widest text-center">المصدر</th>
                                    <th className="py-5 px-8 font-black text-slate-500 text-xs uppercase tracking-widest text-center">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {attendanceData.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-5 px-8">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900">{format(parseISO(record.date), 'd MMMM yyyy', { locale: ar })}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{format(parseISO(record.date), 'EEEE', { locale: ar })}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-sm">{record.doctor?.fullNameArabic}</p>
                                                    <p className="text-[10px] font-bold text-slate-400">{record.doctor?.specialty}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-black">
                                                    {record.shiftCode}
                                                </div>
                                                <span className="text-xs font-bold text-slate-600">{record.shift?.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8 text-center">
                                            <span className={cn(
                                                "text-[10px] font-black px-2 py-1 rounded-lg",
                                                record.source === 'ExcelUpload' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                                            )}>
                                                {record.source === 'ExcelUpload' ? 'رفع إكسل' : 'يدوي'}
                                            </span>
                                        </td>
                                        <td className="py-5 px-8 text-center">
                                            <div className="flex items-center justify-center gap-1.5 text-emerald-600 text-[10px] font-black">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                مكتمل
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {attendanceData.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 text-slate-300">
                                                <Clock className="w-12 h-12 opacity-20" />
                                                <p className="font-black italic">لا توجد سجلات مطابقة للبحث</p>
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
