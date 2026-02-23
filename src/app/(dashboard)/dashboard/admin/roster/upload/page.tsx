'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { alertsApi } from '@/lib/alerts';
import { standardizeDepartment } from '@/lib/department-mapper';
import { rosterService } from '@/lib/firebase-service';
import { RosterRecord } from '@/lib/types';

export default function UploadRosterPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            alert('يرجى اختيار الملف أولاً.');
            return;
        }

        setIsUploading(true);
        setStatus('idle');

        // Force string formatting with padding
        const monthStr = selectedMonth.toString().padStart(2, '0');
        const yearStr = selectedYear.toString();

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const dataBuffer = evt.target?.result as ArrayBuffer;
                const wb = XLSX.read(dataBuffer, { type: 'array', cellDates: true });
                const wsname = wb.SheetNames[0];
                const data = XLSX.utils.sheet_to_json<any>(wb.Sheets[wsname], { raw: false, defval: "" });

                let parsedCount = 0;
                let newAlerts = 0;

                let monthlyShifts: RosterRecord[] = [];
                const targetMonthPrefix = `${yearStr}-${monthStr}`;

                data.forEach((row, index) => {
                    // Flexible mapping for roster codes
                    const fpCode = (row['كود البصمة'] || row['الكود'] || row['كود'] || row['Code'])?.toString().trim();
                    if (!fpCode || fpCode === '') return;

                    const deptRaw = (row['القسم'] || row['التخصص'] || row['Department'])?.toString().trim() || '';
                    const deptObj = standardizeDepartment(deptRaw);

                    if (deptRaw && !deptObj.isRecognized) {
                        alertsApi.addAlert({
                            type: 'system',
                            message: `تنبيه: في جدول المناوبات المرفوع، القسم "${deptObj.raw}" غير مسجل مسبقاً للكود ${fpCode}. يرجى مراجعة الإملاء.`,
                            relatedId: fpCode
                        });
                        newAlerts++;
                    }

                    const canonicalDept = deptObj.canonical || deptRaw;

                    Object.keys(row).forEach(key => {
                        // Attempt to extract the day from the key
                        // It can be direct numbers "1".."31" or dates "1-Feb-26" or "01"
                        let dayNum = -1;

                        const trimmedKey = key.toString().trim();
                        // 1. If it's just a number
                        if (/^(0?[1-9]|[12][0-9]|3[01])$/.test(trimmedKey)) {
                            dayNum = parseInt(trimmedKey);
                        }
                        // 2. If it's a date parsed as a string like "2/1/2026" or "1-Feb-26"
                        else {
                            const match = trimmedKey.match(/^(0?[1-9]|[12][0-9]|3[01])([-/\s\.])/);
                            if (match) {
                                dayNum = parseInt(match[1]);
                            }
                        }

                        // Check if dayNum is valid and matches our extraction
                        if (dayNum >= 1 && dayNum <= 31) {
                            const rawValue = row[key]?.toString().trim() || '';
                            const shiftCode = rawValue.toUpperCase(); // Ensure shifts are mapped properly

                            // Ignore empty, whitespace, asterisks, dashes, zeroes etc if mapped
                            if (shiftCode && shiftCode !== '-' && shiftCode !== '' && shiftCode !== '0' && shiftCode !== 'ملاحظات') {
                                const dateStr = `${yearStr}-${monthStr}-${dayNum.toString().padStart(2, '0')}`;
                                monthlyShifts.push({
                                    id: Math.random().toString(36).substr(2, 9),
                                    doctorId: fpCode,
                                    date: dateStr,
                                    shiftCode: shiftCode,
                                    department: canonicalDept,
                                    source: 'ExcelUpload',
                                    lastModifiedBy: 'admin', // Could be fetched from Auth
                                    lastModifiedAt: new Date().toISOString()
                                });
                                parsedCount++;
                            }
                        }
                    });
                });

                if (parsedCount > 0) {
                    await rosterService.saveBatch(monthlyShifts, targetMonthPrefix);
                    setStatus('success');
                    if (newAlerts > 0) {
                        alert(`تم رفع وتحديث جدول المناوبات بنجاح (${parsedCount} مناوبة).\nيوجد ${newAlerts} أقسام غير معروفة، تم إنشاء إشعارات بها في لوحة التحكم.`);
                    }
                    setTimeout(() => {
                        router.push('/dashboard/admin/roster');
                    }, 2000);
                } else {
                    alert('لم يتم العثور على أي بيانات مناوبات صالحة في الملف، يرجى التاكد من توافق الأعمدة و وجود "كود البصمة" وأرقام الأيام.');
                    setStatus('idle');
                }

            } catch (error) {
                console.error("Error parsing roster file:", error);
                alert("حدث خطأ أثناء قراءة الملف. تأكد من صحة الصيغة.");
                setStatus('error');
            } finally {
                setIsUploading(false);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <PageHeader
                    title="رفع جدول المناوبات (Excel)"
                    subtitle="قم بتحديد الشهر ورفع ملف الإكسل لتحديث جدول الاستدعاءات الشهري"
                />
                <Link
                    href="/dashboard/admin/roster"
                    className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold bg-white px-5 py-3 rounded-xl border border-border shadow-sm"
                >
                    <span>العودة للجدول</span>
                    <ArrowRight className="w-5 h-5" />
                </Link>
            </div>

            <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-border text-center shadow-sm max-w-3xl mx-auto mt-10">
                <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileSpreadsheet className="w-10 h-10" />
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-2">رفع ملف الإكسل المعتمد</h3>
                <p className="text-slate-500 font-bold mb-8 max-w-md mx-auto">
                    يرجى تحديد الشهر المستهدف، ثم إرفاق الملف الذي يحتوي على أيام الشهر كأعمدة.
                </p>

                {status === 'success' ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-6 rounded-2xl flex flex-col items-center justify-center animate-in zoom-in duration-300">
                        <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-500" />
                        <h4 className="text-xl font-black">تم الرفع بنجاح!</h4>
                        <p className="text-sm font-bold mt-1 opacity-80">تم تحديث جدول المناوبات، سيتم تحويلك الآن...</p>
                    </div>
                ) : (
                    <div className="space-y-6">

                        <div className="bg-white p-8 rounded-3xl border border-border shadow-sm mb-6 flex flex-col md:flex-row gap-6 items-center">
                            <div className="flex-1 w-full space-y-2">
                                <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-primary" />
                                    السنة
                                </label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
                                >
                                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1 w-full space-y-2">
                                <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-primary" />
                                    الشهر
                                </label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
                                >
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1} - {new Date(2025, i, 1).toLocaleString('ar', { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                        </div>


                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-200 border-dashed rounded-3xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-10 h-10 mb-4 text-slate-400 group-hover:text-primary transition-colors" />
                                <p className="mb-2 text-sm text-slate-500 font-bold">
                                    <span className="font-black text-primary">اضغط لاختيار ملف</span> أو قم بالسحب والإفلات هنا
                                </p>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest" dir="ltr">.XLSX, .XLS, .CSV</p>
                            </div>
                            <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                        </label>

                        {file && (
                            <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-2xl text-right">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-lg border border-primary/10">
                                        <FileSpreadsheet className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 text-sm" dir="ltr">{file.name}</p>
                                        <p className="text-xs font-bold text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFile(null)}
                                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                                >
                                    <AlertCircle className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        <button
                            onClick={handleUpload}
                            disabled={!file || isUploading}
                            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white px-6 py-4 rounded-2xl hover:bg-primary/90 transition-all font-black shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5" />
                                    <span>بدء المعالجة والرفع</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            <div className="max-w-3xl mx-auto mt-8 flex flex-col md:flex-row gap-4">
                <div className="flex-1 bg-amber-50 border border-amber-100 p-5 rounded-2xl">
                    <h4 className="font-black text-amber-900 mb-2 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        ملاحظة هامة
                    </h4>
                    <p className="text-xs font-bold text-amber-800/80 leading-relaxed">
                        سيقوم النظام بالبحث عن الأعمدة التي تبدأ أسمائها بأرقام الأيام (مثال: 1 أو 1-Feb) لاستخراج المناوبات وتجاهل الباقي. يرجى اختيار الشهر الصحيح لتجنب تداخل البيانات.
                    </p>
                </div>
            </div>
        </div>
    );
}
