'use client';

import React, { useState, useMemo } from 'react';
import { Loader2, Calendar, Phone, Printer, Sun, Moon, ChevronRight, ChevronLeft, Search, Download, Copy, Check } from 'lucide-react';
import { mockShiftTypes } from '@/lib/mockData';
import { Doctor, RosterRecord } from '@/lib/types';
import { doctorService, rosterService } from '@/lib/firebase-service';
import { getCurrentDateISO, formatDate, cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { forceDownloadExcel } from '@/lib/excel-utils';

interface CallSheetDisplayProps {
    isPublic?: boolean;
}

export function CallSheetDisplay({ isPublic = false }: CallSheetDisplayProps) {
    const [selectedDate, setSelectedDate] = useState(getCurrentDateISO());
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [rosters, setRosters] = useState<RosterRecord[]>([]);

    React.useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const monthFilter = selectedDate.substring(0, 7); // Gets YYYY-MM
                const [docsData, rosterData] = await Promise.all([
                    doctorService.getAll(),
                    rosterService.getByMonth(monthFilter)
                ]);
                setDoctors(docsData);
                setRosters(rosterData);
            } catch (error) {
                console.error("Error loading call sheet data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [selectedDate]);

    // Group data for the selected date
    const groupedData = useMemo(() => {
        const dailyRoster = rosters.filter(r => r.date === selectedDate);
        const departmentMap: Record<string, { morning: (Doctor & { shiftCode: string })[], evening: (Doctor & { shiftCode: string })[] }> = {};

        dailyRoster.forEach(record => {
            const doctor = doctors.find(d => d.fingerprintCode === record.doctorId);
            const shift = mockShiftTypes.find(s => s.code === record.shiftCode);

            if (doctor && shift) {
                // Priority: record.department -> doctor.department -> doctor.specialty
                const displayDept = record.department || doctor.department || doctor.specialty || 'عام';

                if (!departmentMap[displayDept]) {
                    departmentMap[displayDept] = { morning: [], evening: [] };
                }

                if (shift.includedInMorning) {
                    departmentMap[displayDept].morning.push({ ...doctor, shiftCode: record.shiftCode });
                }
                if (shift.includedInEvening) {
                    departmentMap[displayDept].evening.push({ ...doctor, shiftCode: record.shiftCode });
                }
            }
        });

        // Filter and sort
        return Object.entries(departmentMap)
            .map(([department, shifts]) => ({
                department,
                morning: shifts.morning.sort((a, b) => a.classificationRank - b.classificationRank),
                evening: shifts.evening.sort((a, b) => a.classificationRank - b.classificationRank),
            }))
            .filter(item =>
                item.department.includes(searchTerm) ||
                item.morning.some(d => d.fullNameArabic.includes(searchTerm)) ||
                item.evening.some(d => d.fullNameArabic.includes(searchTerm))
            )
            .sort((a, b) => a.department.localeCompare(b.department, 'ar'));
    }, [selectedDate, searchTerm, doctors, rosters]);

    const handleCall = (phoneNumber: string) => {
        window.location.href = `tel:${phoneNumber}`;
    };

    const handleCopy = (phoneNumber: string, id: string) => {
        navigator.clipboard.writeText(phoneNumber);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handlePrint = () => {
        window.print();
    };

    const exportToExcel = () => {
        try {
            const fullData: any[] = [];

            if (groupedData.length === 0) {
                alert("لا توجد بيانات لتصديرها لهذا اليوم");
                return;
            }

            groupedData.forEach(item => {
                const maxLen = Math.max(item.morning.length, item.evening.length);
                if (maxLen === 0) return;

                fullData.push({
                    'القسم / التخصص': `=== ${item.department} ===`,
                    'الاسم (صباحي)': '',
                    'التصنيف (صباحي)': '',
                    'الهاتف (صباحي)': '',
                    'الاسم (مسائي)': '',
                    'التصنيف (مسائي)': '',
                    'الهاتف (مسائي)': ''
                });

                for (let i = 0; i < maxLen; i++) {
                    const mDoc = item.morning[i];
                    const eDoc = item.evening[i];

                    fullData.push({
                        'القسم / التخصص': '',
                        'الاسم (صباحي)': mDoc?.fullNameArabic || '',
                        'التصنيف (صباحي)': mDoc?.classification || '',
                        'الهاتف (صباحي)': mDoc?.phoneNumber || '',
                        'الاسم (مسائي)': eDoc?.fullNameArabic || '',
                        'التصنيف (مسائي)': eDoc?.classification || '',
                        'الهاتف (مسائي)': eDoc?.phoneNumber || ''
                    });
                }
                fullData.push({}); // Empty row separating specialties
            });

            const worksheet = XLSX.utils.json_to_sheet(fullData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "CallSheet");

            if (worksheet['!ref']) worksheet['!dir'] = 'rtl';

            forceDownloadExcel(workbook, `Report_${selectedDate}.xlsx`);
        } catch (error: any) {
            alert("حدث خطأ أثناء التصدير: " + error.message);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 no-print pb-4 border-b border-slate-100">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">كشف استدعاءات الأطباء</h2>
                    <p className="text-slate-500 font-bold text-base">الهيئة العامة للرعاية الصحية - مجمع الفيروز الطبي</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center bg-white border-2 border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                        <button
                            onClick={() => {
                                const d = new Date(selectedDate);
                                d.setDate(d.getDate() + 1);
                                setSelectedDate(d.toISOString().split('T')[0]);
                            }}
                            className="p-3.5 hover:bg-slate-50 border-l-2 border-slate-100 transition-colors"
                            title="اليوم التالي"
                        >
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                        </button>
                        <div className="px-5 py-3 flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-teal-600" />
                            <input
                                type="date"
                                className="bg-transparent focus:outline-none font-black text-slate-900 text-lg w-[140px]"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => {
                                const d = new Date(selectedDate);
                                d.setDate(d.getDate() - 1);
                                setSelectedDate(d.toISOString().split('T')[0]);
                            }}
                            className="p-3.5 hover:bg-slate-50 border-r-2 border-slate-100 transition-colors"
                            title="اليوم السابق"
                        >
                            <ChevronLeft className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {!isPublic && (
                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-lg shadow-emerald-600/20"
                        >
                            <Download className="w-5 h-5" />
                            <span>تصدير Excel</span>
                        </button>
                    )}

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl hover:bg-slate-800 transition-all font-bold shadow-lg shadow-slate-900/20"
                    >
                        <Printer className="w-5 h-5" />
                        <span>طباعة التقرير</span>
                    </button>

                    {!isPublic && (
                        <a
                            href="/dashboard"
                            className="p-2 bg-white border border-border rounded-xl flex items-center justify-center transition-all shadow-sm hover:border-primary/50 group"
                            title="الرئيسية"
                        >
                            <img
                                src="https://upload.wikimedia.org/wikipedia/ar/f/ff/%D8%A7%D9%84%D9%87%D9%8A%D8%A6%D8%A9_%D8%A7%D9%84%D8%B9%D8%A7%D9%85%D8%A9_%D9%84%D9%84%D8%B1%D8%B9%D8%A7%D9%8A%D8%A9_%D8%A7%D9%84%D8%B5%D8%AD%D9%8A%D8%A9_%28%D9%85%D8%B5%D8%B1%29.png"
                                alt="شعار الهيئة"
                                className="w-8 h-8 object-contain"
                                crossOrigin="anonymous"
                            />
                        </a>
                    )}
                </div>
            </div>

            <div className="flex md:items-center gap-4 flex-col md:flex-row w-full md:w-auto mt-4 md:mt-0">
                <div className="relative flex-1 md:w-64 no-print">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                        type="text"
                        placeholder="ابحث عن طبيب أو قسم..."
                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
            ) : (
                <div className="space-y-10 no-print">
                    {groupedData.length > 0 ? (
                        groupedData.map((group) => (
                            <div key={group.department} className="break-inside-avoid shadow-sm">
                                <h3 className="text-xl font-black mb-0 bg-slate-200 p-4 rounded-t-2xl border-b-2 border-slate-300 text-slate-800">
                                    {group.department}
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 p-6 border-2 border-t-0 border-slate-100 bg-white rounded-b-2xl">
                                    {/* Morning Period */}
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-black mb-4 border-b-2 border-slate-100 pb-2 flex items-center gap-2">
                                            <Sun className="w-5 h-5 text-amber-500" />
                                            <span>الفترة الصباحية</span>
                                        </h4>
                                        <ShiftTable
                                            doctors={group.morning}
                                            onCall={handleCall}
                                            onCopy={handleCopy}
                                            copiedId={copiedId}
                                            prefix="m"
                                        />
                                    </div>

                                    {/* Evening Period */}
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-black mb-4 border-b-2 border-slate-100 pb-2 flex items-center gap-2">
                                            <Moon className="w-5 h-5 text-indigo-500" />
                                            <span>الفترة المسائية</span>
                                        </h4>
                                        <ShiftTable
                                            doctors={group.evening}
                                            onCall={handleCall}
                                            onCopy={handleCopy}
                                            copiedId={copiedId}
                                            prefix="e"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                            <img
                                src="https://upload.wikimedia.org/wikipedia/ar/f/ff/%D8%A7%D9%84%D9%87%D9%8A%D8%A6%D8%A9_%D8%A7%D9%84%D8%B9%D8%A7%D9%85%D8%A9_%D9%84%D9%84%D8%B1%D8%B9%D8%A7%D9%8A%D8%A9_%D8%A7%D9%84%D8%B5%D8%AD%D9%8A%D8%A9_%28%D9%85%D8%B5%D8%B1%29.png"
                                alt="شعار الهيئة"
                                className="w-20 h-20 object-contain mx-auto mb-4 opacity-20"
                                crossOrigin="anonymous"
                            />
                            <p className="text-slate-400 font-black text-xl">لا توجد أي مناوبات لهذا اليوم.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Official Dedicated Print View */}
            <OfficialPrintReport groupedData={groupedData} selectedDate={selectedDate} />
        </div>
    );
}

function ShiftTable({ doctors, onCall, onCopy, copiedId, prefix }: {
    doctors: (Doctor & { shiftCode: string })[],
    onCall: (phone: string) => void,
    onCopy: (phone: string, id: string) => void,
    copiedId: string | null,
    prefix: string
}) {
    if (doctors.length === 0) {
        return (
            <div className="flex items-center justify-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-400 italic">لا يوجد أطباء مناوبون</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <table className="w-full text-right border-collapse border border-slate-200">
                <thead>
                    <tr className="bg-slate-50 text-slate-600 font-black text-xs">
                        <th className="border border-slate-200 px-4 py-3 w-1/2">الاسم</th>
                        <th className="border border-slate-200 px-4 py-3">التصنيف</th>
                        <th className="border border-slate-200 px-4 py-3">رقم الهاتف</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {doctors.map((doc) => {
                        const cid = `${prefix}-${doc.fingerprintCode}`;
                        const isCopied = copiedId === cid;

                        return (
                            <tr key={cid} className="hover:bg-teal-50/30 transition-colors group">
                                <td className="border border-slate-200 px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-900 text-sm group-hover:text-primary transition-colors">{doc.fullNameArabic}</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter" dir="ltr">{doc.shiftCode}</span>
                                    </div>
                                </td>
                                <td className="border border-slate-200 px-4 py-3 text-center">
                                    <span className={cn(
                                        "px-2 py-1 rounded-md text-[10px] font-black inline-block",
                                        doc.classification === 'استشاري' ? "bg-amber-100 text-amber-800" :
                                            doc.classification === 'أخصائي' ? "bg-blue-100 text-blue-800" :
                                                "bg-slate-100 text-slate-600"
                                    )}>
                                        {doc.classification}
                                    </span>
                                </td>
                                <td className="border border-slate-200 px-4 py-3">
                                    <div className="flex items-center justify-end gap-3 group/contact">
                                        <span className="font-mono font-black text-slate-600 text-sm tracking-tight hover:text-primary transition-colors cursor-pointer" dir="ltr" onClick={() => onCopy(doc.phoneNumber, cid)}>
                                            {doc.phoneNumber}
                                        </span>
                                        <div className="flex items-center gap-1 no-print">
                                            <button
                                                onClick={() => onCopy(doc.phoneNumber, cid)}
                                                className={cn(
                                                    "p-1.5 rounded-lg transition-all border",
                                                    isCopied ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-slate-100 text-slate-300 hover:text-primary hover:border-primary/50"
                                                )}
                                            >
                                                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                            <button
                                                onClick={() => onCall(doc.phoneNumber)}
                                                className="bg-primary/10 text-primary p-1.5 rounded-lg hover:bg-primary hover:text-white transition-all border border-primary/20"
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function OfficialPrintReport({ groupedData, selectedDate }: { groupedData: any[], selectedDate: string }) {
    if (groupedData.length === 0) return null;

    return (
        <div className="hidden print:block bg-white text-black text-sm" dir="rtl">
            <style dangerouslySetInnerHTML={{
                __html: `
                @page { size: A4 portrait; margin: 15mm; }
                @media print {
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .print-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    .print-table th, .print-table td { border: 1.5px solid #000; padding: 6px; text-align: center; vertical-align: middle; }
                    .print-table th { background-color: #f0f0f0 !important; font-weight: bold; }
                    .specialty-row { background-color: #e5e5e5 !important; font-weight: 900; font-size: 1.1em; }
                    .period-header { background-color: #f8f8f8 !important; }
                }
            `}} />

            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                <div className="text-right w-1/3">
                    <p className="font-bold">الهيئة العامة للرعاية الصحية</p>
                    <p className="font-black text-lg mt-2">مجمع الفيروز الطبي</p>
                </div>

                <div className="text-center flex flex-col items-center justify-start w-1/3">
                    <img
                        src="https://upload.wikimedia.org/wikipedia/ar/f/ff/%D8%A7%D9%84%D9%87%D9%8A%D8%A6%D8%A9_%D8%A7%D9%84%D8%B9%D8%A7%D9%85%D8%A9_%D9%84%D9%84%D8%B1%D8%B9%D8%A7%D9%8A%D8%A9_%D8%A7%D9%84%D8%B5%D8%AD%D9%8A%D8%A9_%28%D9%85%D8%B5%D8%B1%29.png"
                        alt="شعار الهيئة العامة للرعاية الصحية"
                        className="w-16 h-16 object-contain mb-2"
                        crossOrigin="anonymous"
                    />
                </div>

                <div className="text-left w-1/3 flex flex-col justify-between items-end">
                    <p className="font-bold" dir="ltr">General Authority for Healthcare</p>

                    <div className="mt-2 w-full max-w-[200px] text-right">
                        <p className="font-bold text-sm bg-slate-100 py-2 px-3 rounded-md inline-block w-full text-center border border-slate-200">
                            {formatDate(selectedDate)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="text-center mb-6 px-4">
                <h1 className="text-2xl font-black underline underline-offset-4">
                    كشف الاستدعاءات اليومي للأطباء <span dir="ltr" className="inline-block">(Call Sheet)</span>
                </h1>
            </div>

            <table className="print-table">
                <thead>
                    <tr>
                        <th rowSpan={2} style={{ width: '15%' }}>القسم / التخصص</th>
                        <th colSpan={3} className="period-header">الفترة الصباحية (عادي)</th>
                        <th colSpan={3} className="period-header">الفترة المسائية (استدعاء)</th>
                    </tr>
                    <tr>
                        <th style={{ width: '18%' }}>الاسم</th>
                        <th style={{ width: '10%' }}>التصنيف</th>
                        <th style={{ width: '14.5%' }}>الجوال</th>
                        <th style={{ width: '18%' }}>الاسم</th>
                        <th style={{ width: '10%' }}>التصنيف</th>
                        <th style={{ width: '14.5%' }}>الجوال</th>
                    </tr>
                </thead>
                <tbody>
                    {groupedData.map((group) => {
                        const maxLen = Math.max(group.morning.length, group.evening.length);
                        if (maxLen === 0) return null;

                        const formatClassification = (cls: string | undefined) => {
                            if (!cls) return '-';
                            if (cls === 'طبيب مقيم') return 'ط مقيم';
                            return cls;
                        };

                        const rows = [];
                        for (let i = 0; i < maxLen; i++) {
                            const mDoc = group.morning[i];
                            const eDoc = group.evening[i];

                            rows.push(
                                <tr key={`${group.department}-${i}`}>
                                    {i === 0 && (
                                        <td rowSpan={maxLen} className="font-black text-base bg-gray-50 align-middle">
                                            {group.department}
                                        </td>
                                    )}
                                    <td className="font-bold">{mDoc?.fullNameArabic || '-'}</td>
                                    <td className="text-xs">{formatClassification(mDoc?.classification)}</td>
                                    <td className="font-mono text-sm tracking-tighter max-w-[120px]" dir="ltr">{mDoc?.phoneNumber || '-'}</td>
                                    <td className="font-bold">{eDoc?.fullNameArabic || '-'}</td>
                                    <td className="text-xs">{formatClassification(eDoc?.classification)}</td>
                                    <td className="font-mono text-sm tracking-tighter max-w-[120px]" dir="ltr">{eDoc?.phoneNumber || '-'}</td>
                                </tr>
                            );
                        }
                        return rows;
                    })}
                </tbody>
            </table>

            <div className="mt-12 pt-4 border-t border-black text-xs font-bold text-gray-500 flex justify-center uppercase">
                <span>MAO for Software Solutions</span>
            </div>
        </div>
    );
}
