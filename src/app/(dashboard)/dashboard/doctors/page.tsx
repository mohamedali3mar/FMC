'use client';
// Force rebuild to fix potential 404 routing issue


import React, { useState } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    UserPlus,
    Filter,
    CheckCircle2,
    XCircle,
    X,
    User,
    Phone,
    Hash,
    Stethoscope as StethoscopeIcon,
    Download,
    Loader2,
    UploadCloud
} from 'lucide-react';
import { Doctor, Classification } from '@/lib/types';
import { doctorService } from '@/lib/firebase-service';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { alertsApi } from '@/lib/alerts';
import { AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { forceDownloadExcel } from '@/lib/excel-utils';
import { DEPARTMENTS_MAPPING, standardizeDepartment } from '@/lib/department-mapper';

import { Suspense } from 'react';

const MEDICAL_SPECIALTIES = [
    'اشعة تشخيصية',
    'اطفال مبتسرين',
    'الاشعة التشخيصية',
    'الأشعة التشخيصية',
    'الاشعة العلاجية والطب النووى',
    'الأشعة العلاجية والطب النووي',
    'الامراض الصدرية',
    'الأمراض الصدرية',
    'امراض السمعيات',
    'أمراض السمعيات',
    'امراض روماتيزمية',
    'امراض عصبية',
    'امراض كلى',
    'امراض نفسية و عصبية',
    'ايكو قلب اطفال',
    'باثولوجيا اكلينيكية',
    'الباثولوجيا الإكلينيكية',
    'باطنة عامة',
    'الباطنة العامة',
    'بنك دم',
    'تخدير',
    'التخدير',
    'جراحة اطفال',
    'جراحة أطفال',
    'جراحة العظام',
    'جراحة انف واذن وحنجرة',
    'الأنف والأذن والحنجرة',
    'جراحة اورام',
    'جراحة اوعية دموية',
    'جراحة تجميل و حروق',
    'جراحة عامة',
    'الجراحة العامة',
    'جراحة قلب و صدر',
    'جراحة مخ واعصاب',
    'المخ والأعصاب',
    'جراحة مسالك',
    'جراحة وجه وفكين',
    'جلدية وتناسلية',
    'جهاز هضمى',
    'جهاز هضمى وكبد',
    'الجهاز الهضمي',
    'رعاية حرجة',
    'طب الاورام',
    'طب حالات حرجة',
    'طب و جراحة العيون',
    'طب وجراحة العيون',
    'طوارئ',
    'الطوارئ',
    'عناية مركزة',
    'العناية المركزة',
    'عناية مركزة اطفال',
    'غدد صماء',
    'غسيل كلوى',
    'قلب واوعية',
    'مناظير الجراحة',
    'مناظير المفاصل',
    'نسا وتوليد',
    'النساء والتوليد'
];

function DoctorsContent() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClassification, setFilterClassification] = useState<string>('الكل');
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDoctor, setCurrentDoctor] = useState<Partial<Doctor> | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const searchParams = useSearchParams();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const prefillCode = searchParams.get('code');
    const prefillName = searchParams.get('name');
    const prefillSpecialty = searchParams.get('specialty');
    const prefillDept = searchParams.get('dept');

    React.useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const data = await doctorService.getAll();
                setDoctors(data);

                // Handle pre-fill after doctors are loaded
                if (prefillCode) {
                    const existingDoctor = data.find(d => d.fingerprintCode === prefillCode);
                    if (existingDoctor) {
                        handleOpenModal({
                            ...existingDoctor,
                            department: prefillDept || existingDoctor.department,
                            specialty: prefillSpecialty || existingDoctor.specialty,
                        });
                    } else {
                        handleOpenModal({
                            fingerprintCode: prefillCode,
                            fullNameArabic: prefillName || '',
                            phoneNumber: '',
                            classification: 'أخصائي',
                            classificationRank: 2,
                            specialty: prefillSpecialty || '',
                            department: prefillDept || '',
                            isActive: true,
                        });
                    }
                }
            } catch (error) {
                console.error("Error fetching doctors:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDoctors();
    }, [prefillCode, prefillName, prefillSpecialty, prefillDept]);

    const filteredDoctors = doctors.filter(doctor => {
        const matchesSearch = doctor.fullNameArabic.includes(searchTerm) ||
            doctor.specialty.includes(searchTerm) ||
            doctor.fingerprintCode.includes(searchTerm);
        const matchesFilter = filterClassification === 'الكل' || doctor.classification === filterClassification;
        return matchesSearch && matchesFilter;
    });

    const classifications: (Classification | 'الكل')[] = ['الكل', 'استشاري', 'أخصائي', 'طبيب مقيم'];

    const handleOpenModal = (doctor: Doctor | null = null) => {
        setIsEditMode(!!doctor);
        setCurrentDoctor(doctor ? { ...doctor } : {
            fingerprintCode: '',
            fullNameArabic: '',
            phoneNumber: '',
            classification: 'أخصائي',
            classificationRank: 2,
            specialty: '',
            department: '',
            isActive: true,
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentDoctor || !currentDoctor.fingerprintCode) return;

        const isEditing = doctors.some(d => d.fingerprintCode === currentDoctor.fingerprintCode);

        // Standardize department for consistency
        const deptObj = standardizeDepartment(currentDoctor.department || '');
        const finalDoctor: Doctor = {
            fingerprintCode: currentDoctor.fingerprintCode.trim(),
            fullNameArabic: (currentDoctor.fullNameArabic || '').trim(),
            nationalId: (currentDoctor.nationalId || '').trim(),
            phoneNumber: (currentDoctor.phoneNumber || '').trim(),
            classification: currentDoctor.classification || 'أخصائي',
            classificationRank: currentDoctor.classificationRank || 2,
            specialty: (currentDoctor.specialty || '').trim(),
            department: deptObj.canonical || (currentDoctor.department || '').trim(),
            isActive: currentDoctor.isActive !== undefined ? currentDoctor.isActive : true,
        };

        if (!finalDoctor.fullNameArabic || !finalDoctor.fingerprintCode) {
            alert('يرجى التأكد من إدخال كود البصمة والاسم');
            return;
        }

        // Check if specialty is unrecognized
        if (finalDoctor.specialty && !MEDICAL_SPECIALTIES.includes(finalDoctor.specialty)) {
            const confirmNew = confirm(`تنبيه: التخصص "${finalDoctor.specialty}" غير موجود في القائمة المعتمدة. هل تريد حفظه على أي حال؟`);
            if (!confirmNew) return;

            alertsApi.addAlert({
                type: 'system',
                message: `تنبيه: تم إدراج طبيب (${finalDoctor.fullNameArabic}) بتخصص غير مسجل مسبقاً: "${finalDoctor.specialty}". يرجى التحقق من القوائم الأساسية.`,
                relatedId: finalDoctor.fingerprintCode
            });
        }

        // Strictly block if fingerprint code is used by another doctor
        const conflictDoctor = doctors.find(d =>
            d.fingerprintCode === finalDoctor.fingerprintCode &&
            d.fullNameArabic !== finalDoctor.fullNameArabic
        );

        if (conflictDoctor) {
            alert(`خطأ: كود البصمة (${finalDoctor.fingerprintCode}) مسجل بالفعل للطبيب: ${conflictDoctor.fullNameArabic}. لا يمكن تكراره.`);
            return;
        }

        setIsSaving(true);
        try {
            await doctorService.save(finalDoctor);

            if (isEditing) {
                setDoctors(doctors.map(d => d.fingerprintCode === finalDoctor.fingerprintCode ? finalDoctor : d));
            } else {
                setDoctors([...doctors, finalDoctor]);
                // Clear alert if it was a missing doctor registration
                alertsApi.markAsReadByRelatedId(finalDoctor.fingerprintCode);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving doctor:", error);
            alert("حدث خطأ أثناء حفظ البيانات. يرجى مراجعة الاتصال.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (code: string) => {
        if (confirm('هل أنت متأكد من حذف هذا الطبيب؟')) {
            try {
                await doctorService.delete(code);
                setDoctors(doctors.filter(d => d.fingerprintCode !== code));
            } catch (error) {
                console.error("Error deleting doctor:", error);
                alert("حدث خطأ أثناء الحذف.");
            }
        }
    };

    const toggleStatus = async (code: string) => {
        const doctor = doctors.find(d => d.fingerprintCode === code);
        if (!doctor) return;

        const updatedDoctor = { ...doctor, isActive: !doctor.isActive };
        setDoctors(doctors.map(d => d.fingerprintCode === code ? updatedDoctor : d));

        try {
            await doctorService.save(updatedDoctor);
        } catch (error) {
            console.error("Status update failed:", error);
            setDoctors(doctors.map(d => d.fingerprintCode === code ? doctor : d)); // Revert on failure
            alert("حدث خطأ أثناء تحديث الحالة.");
        }
    };

    const handleExportTemplate = () => {
        try {
            // Use CSV format with BOM for Arabic support as it's natively supported and less prone to library errors
            const csvContent = '\uFEFF' // BOM for UTF-8
                + "كود البصمة,الاسم باللغة العربية,الرقم القومى,رقم الهاتف,التصنيف,التخصص\n"
                + "13946,محروس احمد هارون على,26801201202877,01065816006,استشاري,باطنة عامة\n"
                + "39627,رحاب شاكر عبدالفضيل محمد الحاجة,28410291700569,01010156196,اخصائي,غسيل كلوى";

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Doctors_Template.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export error:", error);
            alert("حدث خطأ أثناء تحميل الملف.");
        }
    };

    const handleExportAll = () => {
        if (doctors.length === 0) {
            alert('لا توجد بيانات لتصديرها!');
            return;
        }

        const dataToExport = doctors.map(d => ({
            'كود البصمة': d.fingerprintCode,
            'الاسم باللغة العربية': d.fullNameArabic,
            'الرقم القومى': d.nationalId || '',
            'رقم الهاتف': d.phoneNumber || '',
            'التصنيف': d.classification,
            'القسم': d.department,
            'التخصص': d.specialty,
            'حالة الطبيب': d.isActive ? 'نشط' : 'غير نشط'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'الأطباء');
        ws['!dir'] = 'rtl';
        forceDownloadExcel(wb, `Doctors_List.xlsx`);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            setIsLoading(true);
            try {
                const dataBuffer = evt.target?.result as ArrayBuffer;
                let data: any[] = [];

                // Standardize on array buffer reading for best compatibility
                const wb = XLSX.read(dataBuffer, { type: 'array', cellDates: true });
                const wsname = wb.SheetNames[0];
                data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

                const newDoctors: Doctor[] = [];
                const codesInFile = new Set<string>();
                let errors = 0;
                let conflicts = 0;

                data.forEach((row, index) => {
                    // Skip the template example row if it's identical
                    if (row['كود البصمة']?.toString() === '13946' && row['الاسم باللغة العربية'] === 'محروس احمد هارون على') {
                        return;
                    }

                    // Flexible code mapping
                    const fpCode = (row['كود البصمة'] || row['الكود'] || row['كود'] || row['Code'])?.toString().trim();
                    const name = (row['الاسم باللغة العربية'] || row['الاسم الكامل'] || row['الاسم'] || row['Name'])?.toString().trim();

                    if (!fpCode || !name) {
                        errors++;
                        return;
                    }

                    // Check for internal duplicates in the Excel file
                    if (codesInFile.has(fpCode)) {
                        conflicts++;
                        alertsApi.addAlert({
                            type: 'conflict',
                            message: `تعارض داخلي: كود البصمة (${fpCode}) مكرر داخل ملف الإكسيل للطبيب "${name}".`,
                            relatedId: fpCode
                        });
                        return;
                    }
                    codesInFile.add(fpCode);

                    // Check for conflicts with existing doctors in DB
                    const existingDoctor = doctors.find(d => d.fingerprintCode === fpCode);
                    if (existingDoctor && existingDoctor.fullNameArabic !== name) {
                        conflicts++;
                        alertsApi.addAlert({
                            type: 'conflict',
                            message: `تعارض بيانات: كود البصمة (${fpCode}) مسجل مسبقاً للطبيب "${existingDoctor.fullNameArabic}"، ولا يمكن استخدامه للطبيب "${name}".`,
                            relatedId: fpCode,
                            metadata: {
                                doctorName: name,
                                department: (row['القسم'] || row['التخصص'] || row['Department'] || '').toString().trim()
                            }
                        });
                        return;
                    }

                    const nationalId = (row['الرقم القومى'] || row['الرقم القومى'] || row['الرقم القومي'] || row['National ID'])?.toString().trim();
                    const phone = (row['رقم الهاتف'] || row['الهاتف'] || row['Phone'])?.toString().trim();
                    const classificationRaw = (row['التصنيف'] || row['الدرجة الوظيفية'] || row['Classification'])?.toString().trim() || 'أخصائي';

                    // Map the classification based on provided sheet or default safely
                    let classification: Classification = 'أخصائي';
                    const cLower = classificationRaw.toLowerCase();
                    if (cLower.includes('استشاري') || cLower.includes('استشارى') || cLower.includes('consultant')) classification = 'استشاري';
                    else if (cLower.includes('مقيم') || cLower.includes('طبيب مقيم') || cLower.includes('resident')) classification = 'طبيب مقيم';
                    else if (cLower.includes('اخصائي') || cLower.includes('أخصائي') || cLower.includes('اخصائى') || cLower.includes('أخصائى') || cLower.includes('specialist')) classification = 'أخصائي';

                    // Prioritize 'التخصص' for professional background
                    const specialtyRaw = (row['التخصص'] || row['القسم'] || row['Specialty'] || '').toString().trim();
                    const departmentRaw = (row['القسم'] || row['التخصص'] || row['Department'] || '').toString().trim();

                    const deptObj = standardizeDepartment(departmentRaw);

                    if (specialtyRaw && !MEDICAL_SPECIALTIES.includes(specialtyRaw)) {
                        alertsApi.addAlert({
                            type: 'system',
                            message: `تنبيه: طبيب (${name}) مدرج بتخصص غير مسجل مسبقاً: "${specialtyRaw}".`,
                            relatedId: fpCode,
                            metadata: {
                                doctorName: name,
                                specialty: specialtyRaw,
                                department: departmentRaw
                            }
                        });
                    }

                    if (departmentRaw && !deptObj.isRecognized) {
                        alertsApi.addAlert({
                            type: 'system',
                            message: `تنبيه: طبيب (${name}) مدرج بقسم إداري غير مسجل مسبقاً: "${departmentRaw}".`,
                            relatedId: fpCode,
                            metadata: {
                                doctorName: name,
                                specialty: specialtyRaw,
                                department: departmentRaw
                            }
                        });
                    }

                    const specialty = specialtyRaw;
                    const department = deptObj.canonical || departmentRaw;

                    const rank = classification === 'استشاري' ? 1 : classification === 'أخصائي' ? 2 : 3;

                    newDoctors.push({
                        fingerprintCode: fpCode,
                        fullNameArabic: name,
                        nationalId: nationalId || '',
                        phoneNumber: phone || '',
                        classification: classification,
                        classificationRank: rank,
                        specialty: specialty || '',
                        department: department,
                        isActive: true
                    });
                });

                if (newDoctors.length > 0) {
                    // Merge, avoiding duplicates by code
                    const existingCodes = new Set(doctors.map(d => d.fingerprintCode));
                    const addedDocs = newDoctors.filter(d => !existingCodes.has(d.fingerprintCode));

                    if (addedDocs.length > 0) {
                        await doctorService.saveBatch(addedDocs);
                        setDoctors(prev => [...prev, ...addedDocs]);

                        let msg = `تم رفع وإضافة ${addedDocs.length} طبيب بنجاح.`;
                        if (conflicts > 0) msg += `\nتم تخطي ${conflicts} سطر بسبب تعارض كود البصمة (راجع التنبيهات).`;
                        alert(msg);
                    } else if (errors === 0 && conflicts === 0) {
                        alert('جميع الأطباء في الملف مضافون مسبقاً.');
                    } else if (conflicts > 0) {
                        alert(`لم يتم إضافة أطباء جدد. تم تخطي ${conflicts} سطر بسبب تعارض كود البصمة مع سجلات أخرى.`);
                    }
                } else if (errors > 0 || conflicts > 0 || data.length > 0) {
                    let msg = "لم يتم إضافة أطباء جدد.";
                    if (conflicts > 0) msg += `\nوجد ${conflicts} تعارض في بيانات كود البصمة (راجع التنبيهات للاطلاع على التفاصيل).`;
                    if (errors > 0) msg += `\nوجد ${errors} سطر ببيانات ناقصة.`;
                    alert(msg);
                }

                if (errors > 0) {
                    console.warn(`Skipped ${errors} rows due to missing essential data.`);
                }

            } catch (e: any) {
                console.error("Error parsing/saving doctor file:", e);
                const errorMsg = e?.message || "غير معروف";
                alert(`حدث خطأ أثناء قراءة البيانات أو حفظها: ${errorMsg}\nتأكد من صلاحيات Firebase ومن صيغة الملف.`);
            } finally {
                setIsLoading(false);
            }
            // clear input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="إدارة بيانات الأطباء"
                subtitle="إدارة بيانات الأطباء، الأكواد، والتخصصات الطبية"
                actions={
                    <div className="flex flex-wrap flex-row-reverse md:flex-row items-center gap-3">
                        <button
                            type="button"
                            onClick={handleExportAll}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl hover:bg-emerald-700 transition-all font-bold shadow-lg shadow-emerald-600/20"
                            title="تصدير القائمة"
                        >
                            <Download className="w-5 h-5 shrink-0" />
                            <span className="hidden sm:inline">تصدير Data</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleExportTemplate}
                            className="flex items-center gap-2 bg-white text-slate-700 px-4 py-3 rounded-2xl border border-border hover:bg-slate-50 transition-all font-bold shadow-sm"
                            title="تحميل نموذج فارغ"
                        >
                            <Download className="w-5 h-5 shrink-0" />
                            <span className="hidden xl:inline">النموذج</span>
                        </button>

                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-2xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-600/20"
                        >
                            <UploadCloud className="w-5 h-5 shrink-0" />
                            <span className="hidden sm:inline">رفع مجمع (Excel)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl hover:bg-primary/90 transition-all font-black shadow-lg shadow-primary/20"
                        >
                            <UserPlus className="w-5 h-5 shrink-0" />
                            <span className="hidden sm:inline">إضافة طبيب جديد</span>
                        </button>
                    </div>
                }
            />

            <div className="bg-white p-6 rounded-3xl border border-border shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <input
                            type="text"
                            placeholder="البحث بالاسم، التخصص، أو الكود..."
                            className="w-full pr-12 pl-4 py-3.5 rounded-2xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 border border-border rounded-2xl bg-slate-50/50 min-w-[220px]">
                        <Filter className="text-muted-foreground w-4 h-4" />
                        <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">تصفية حسب:</span>
                        <select
                            className="bg-transparent focus:outline-none w-full text-sm font-bold text-slate-700 cursor-pointer"
                            value={filterClassification}
                            onChange={(e) => setFilterClassification(e.target.value)}
                        >
                            {classifications.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                        <table className="w-full text-right">
                            <thead>
                                <tr className="bg-slate-50 border-b border-border text-slate-500 text-xs font-black uppercase tracking-wider">
                                    <th className="py-4 px-6">كود البصمة</th>
                                    <th className="py-4 px-6">الاسم الكامل</th>
                                    <th className="py-4 px-6">الرقم القومي</th>
                                    <th className="py-4 px-6">التصنيف</th>
                                    <th className="py-4 px-6">التخصص</th>
                                    <th className="py-4 px-6">رقم الهاتف</th>
                                    <th className="py-4 px-6">الحالة</th>
                                    <th className="py-4 px-6 text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredDoctors.map((doctor) => (
                                    <tr key={doctor.fingerprintCode} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-4 px-6 font-mono text-xs text-slate-500 font-bold">{doctor.fingerprintCode}</td>
                                        <td className="py-4 px-6 font-black text-slate-900">{doctor.fullNameArabic}</td>
                                        <td className="py-4 px-6 font-mono text-sm tracking-tighter text-slate-600 font-bold" dir="ltr">{doctor.nationalId || '-'}</td>
                                        <td className="py-4 px-6">
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-black tracking-tight",
                                                doctor.classification === 'استشاري' ? "bg-amber-100 text-amber-700" :
                                                    doctor.classification === 'أخصائي' ? "bg-blue-100 text-blue-700" :
                                                        "bg-slate-100 text-slate-700"
                                            )}>
                                                {doctor.classification}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm font-bold text-slate-600">{doctor.specialty}</td>
                                        <td className="py-4 px-6 font-mono text-sm tracking-tighter font-bold" dir="ltr">{doctor.phoneNumber}</td>
                                        <td className="py-4 px-6">
                                            <button
                                                onClick={() => toggleStatus(doctor.fingerprintCode)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors",
                                                    doctor.isActive ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" : "text-rose-600 bg-rose-50 hover:bg-rose-100"
                                                )}
                                            >
                                                {doctor.isActive ? (
                                                    <>
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-black whitespace-nowrap">نشط</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-black whitespace-nowrap">موقف</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(doctor)}
                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(doctor.fingerprintCode)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredDoctors.length === 0 && (
                            <div className="py-20 text-center space-y-4">
                                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-slate-200">
                                    <Search className="w-10 h-10" />
                                </div>
                                <div>
                                    <p className="font-black text-slate-800">لا توجد نتائج للبحث</p>
                                    <p className="text-muted-foreground text-sm mt-1">جرب كلمات بحث أخرى أو أضف طبيباً جديداً</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Doctor Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                        <div className="p-8 bg-slate-50 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary p-3 rounded-2xl text-white shadow-lg shadow-primary/20">
                                    <UserPlus className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">
                                        {currentDoctor?.fingerprintCode ? 'تعديل بيانات الطبيب' : 'إضافة طبيب جديد'}
                                    </h3>
                                    <p className="text-xs font-bold text-muted-foreground mt-0.5">يرجى ملء كافة الحقول بدقة</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-900"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {prefillCode === currentDoctor?.fingerprintCode && !doctors.find(d => d.fingerprintCode === prefillCode) && (
                            <div className="mx-8 mt-4 bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 text-amber-800 animate-pulse">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="text-xs font-black">كود مفقود: يرجى إكمال بيانات هذا الطبيب لحل تنبيه لوحة التحكم.</p>
                            </div>
                        )}

                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-700 mr-1 flex items-center gap-1">
                                        <Hash className="w-3 h-3 text-primary" />
                                        كود البصمة
                                    </label>
                                    <input
                                        required
                                        disabled={isEditMode}
                                        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:font-normal bg-slate-50/50"
                                        placeholder="D005"
                                        value={currentDoctor?.fingerprintCode || ''}
                                        onChange={e => setCurrentDoctor({ ...currentDoctor, fingerprintCode: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-700 mr-1 flex items-center gap-1">
                                        <User className="w-3 h-3 text-primary" />
                                        الاسم الكامل
                                    </label>
                                    <input
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:font-normal bg-slate-50/50"
                                        placeholder="د. فلان بن فلان الفلاني"
                                        value={currentDoctor?.fullNameArabic || ''}
                                        onChange={e => setCurrentDoctor({ ...currentDoctor, fullNameArabic: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-700 mr-1 flex items-center gap-1">
                                        <Hash className="w-3 h-3 text-primary" />
                                        الرقم القومي
                                    </label>
                                    <input
                                        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:font-normal bg-slate-50/50 text-left"
                                        dir="ltr"
                                        placeholder="14XXXXXXXXXXXX"
                                        value={currentDoctor?.nationalId || ''}
                                        onChange={e => setCurrentDoctor({ ...currentDoctor, nationalId: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-700 mr-1 flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-primary" />
                                        رقم الهاتف
                                    </label>
                                    <input
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:font-normal bg-slate-50/50 text-left"
                                        dir="ltr"
                                        placeholder="01XXXXXXXXX"
                                        value={currentDoctor?.phoneNumber || ''}
                                        onChange={e => setCurrentDoctor({ ...currentDoctor, phoneNumber: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-700 mr-1 flex items-center gap-1">
                                        <Filter className="w-3 h-3 text-primary" />
                                        التصنيف
                                    </label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 transition-all font-black bg-slate-50/50"
                                        value={currentDoctor?.classification || 'أخصائي'}
                                        onChange={e => {
                                            const val = e.target.value as Classification;
                                            const rank = val === 'استشاري' ? 1 : val === 'أخصائي' ? 2 : 3;
                                            setCurrentDoctor({ ...currentDoctor, classification: val, classificationRank: rank });
                                        }}
                                    >
                                        <option value="استشاري">استشاري</option>
                                        <option value="أخصائي">أخصائي</option>
                                        <option value="طبيب مقيم">طبيب مقيم</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-700 mr-1 flex items-center gap-1">
                                        <StethoscopeIcon className="w-3 h-3 text-primary" />
                                        التخصص
                                    </label>
                                    <input
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:font-normal bg-slate-50/50"
                                        placeholder="الجراحة، الأطفال..."
                                        list="specialties-list"
                                        value={currentDoctor?.specialty || ''}
                                        onChange={e => setCurrentDoctor({ ...currentDoctor, specialty: e.target.value })}
                                    />
                                    <datalist id="specialties-list">
                                        {MEDICAL_SPECIALTIES.map(spec => (
                                            <option key={spec} value={spec} />
                                        ))}
                                    </datalist>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-700 mr-1 flex items-center gap-1">
                                        <Hash className="w-3 h-3 text-primary" />
                                        القسم
                                    </label>
                                    <input
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:font-normal bg-slate-50/50"
                                        placeholder="الرعاية المركزة، الطوارئ..."
                                        list="departments-list"
                                        value={currentDoctor?.department || ''}
                                        onChange={e => setCurrentDoctor({ ...currentDoctor, department: e.target.value })}
                                    />
                                    <datalist id="departments-list">
                                        {DEPARTMENTS_MAPPING.map(dept => (
                                            <option key={dept.canonicalName} value={dept.canonicalName} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 rounded-2xl border border-border font-black text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    إلغاء التعديلات
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 py-4 rounded-2xl bg-primary text-white font-black hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all disabled:opacity-70 flex justify-center items-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ البيانات'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DoctorsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        }>
            <DoctorsContent />
        </Suspense>
    );
}

