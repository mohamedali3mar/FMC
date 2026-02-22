'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Plus, Edit2, Trash2, Clock, CheckCircle2, XCircle, Search, Save, X } from 'lucide-react';
import { mockShiftTypes } from '@/lib/mockData';
import { ShiftType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { alertsApi } from '@/lib/alerts';

export default function ShiftsPage() {
    const [shifts, setShifts] = useState<ShiftType[]>(mockShiftTypes);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentShift, setCurrentShift] = useState<Partial<ShiftType> | null>(null);

    const filteredShifts = shifts.filter(s =>
        s.name.includes(searchTerm) ||
        s.code.includes(searchTerm)
    );

    const handleOpenModal = (shift: ShiftType | null = null) => {
        setCurrentShift(shift || {
            code: '',
            name: '',
            startTime: '08:00',
            endTime: '16:00',
            durationHours: 8,
            includedInMorning: true,
            includedInEvening: false,
            countsAsWorkingShift: true,
        });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentShift || !currentShift.code) return;

        if (shifts.some(s => s.code === currentShift.code && s !== currentShift)) {
            // Updating existing
            setShifts(shifts.map(s => s.code === currentShift.code ? currentShift as ShiftType : s));
        } else {
            // Adding new
            setShifts([...shifts, currentShift as ShiftType]);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (code: string) => {
        if (confirm('هل أنت متأكد من حذف هذا المناوبة؟ سيؤثر هذا على الجداول المرتبطة.')) {
            setShifts(shifts.filter(s => s.code !== code));
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="إعدادات المناوبات"
                subtitle="إدارة أنواع المناوبات، الأوقات، والترتيب"
                actions={
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl hover:bg-primary/90 transition-all font-black shadow-lg shadow-primary/20"
                    >
                        <Plus className="w-5 h-5" />
                        <span>إضافة مناوبة جديدة</span>
                    </button>
                }
            />

            <div className="bg-white p-6 rounded-3xl border border-border shadow-sm space-y-6">
                <div className="relative max-w-md">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <input
                        type="text"
                        placeholder="البحث باسم المناوبة أو الكود..."
                        className="w-full pr-12 pl-4 py-3.5 rounded-2xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50 font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredShifts.map(shift => (
                        <div key={shift.code} className="bg-white border-2 border-slate-100 rounded-2xl p-6 hover:border-primary/30 transition-all group shadow-sm flex flex-col h-full">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md" dir="ltr">
                                            {shift.code}
                                        </span>
                                        <h3 className="text-lg font-black text-slate-900">{shift.name}</h3>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500 mt-2">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-sm font-bold tracking-tight" dir="ltr">
                                            {shift.startTime} - {shift.endTime}
                                        </span>
                                        <span className="text-xs bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 font-bold ml-2">
                                            {shift.durationHours} ساعات
                                        </span>
                                    </div>
                                </div>
                                <div className="flex bg-slate-50 rounded-lg p-1 border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(shift)} className="p-1.5 text-slate-400 hover:text-primary rounded-md hover:bg-white transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(shift.code)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-white transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-sm">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-600 font-bold">
                                        {shift.includedInMorning ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-300" />}
                                        <span className="text-xs">فترة صباحية</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 font-bold">
                                        {shift.includedInEvening ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-300" />}
                                        <span className="text-xs">فترة مسائية</span>
                                    </div>
                                </div>
                                <div className="flex items-end justify-end">
                                    <span className={cn(
                                        "text-xs font-black px-3 py-1.5 rounded-lg",
                                        shift.countsAsWorkingShift ? "bg-teal-50 text-teal-700" : "bg-rose-50 text-rose-700"
                                    )}>
                                        {shift.countsAsWorkingShift ? 'يحتسب كعمل' : 'لا يحتسب'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredShifts.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 font-bold bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            لا توجد مناوبات مطابقة للبحث
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20">
                        <div className="p-8 bg-slate-50 border-b border-border flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900">
                                {currentShift?.code && shifts.some(s => s.code === currentShift.code) ? 'تعديل بيانات المناوبة' : 'إضافة مناوبة جديدة'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-900"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-700">كود المناوبة (مثل 24H)</label>
                                    <input
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 transition-all font-bold bg-slate-50/50"
                                        value={currentShift?.code || ''}
                                        onChange={e => setCurrentShift({ ...currentShift, code: e.target.value })}
                                        disabled={!!(currentShift?.code && shifts.some(s => s.code === currentShift?.code))}
                                        dir="ltr"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-700">الاسم الوصفي</label>
                                    <input
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 transition-all font-bold bg-slate-50/50"
                                        value={currentShift?.name || ''}
                                        onChange={e => setCurrentShift({ ...currentShift, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-700">وقت البدء</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 transition-all font-bold bg-slate-50/50"
                                        value={currentShift?.startTime || '00:00'}
                                        onChange={e => setCurrentShift({ ...currentShift, startTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-700">وقت الانتهاء</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 transition-all font-bold bg-slate-50/50"
                                        value={currentShift?.endTime || '00:00'}
                                        onChange={e => setCurrentShift({ ...currentShift, endTime: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-black text-slate-700">مدة المناوبة (ساعات)</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="24"
                                        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 transition-all font-bold bg-slate-50/50"
                                        value={currentShift?.durationHours || 8}
                                        onChange={e => setCurrentShift({ ...currentShift, durationHours: parseInt(e.target.value) || 8 })}
                                    />
                                </div>
                            </div>

                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 mt-6 space-y-4">
                                <h4 className="font-black text-sm text-slate-800 mb-2">خصائص المناوبة</h4>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                                        checked={currentShift?.includedInMorning || false}
                                        onChange={e => setCurrentShift({ ...currentShift, includedInMorning: e.target.checked })}
                                    />
                                    <span className="font-bold text-sm text-slate-700 group-hover:text-primary transition-colors">تظهر في الفترة الصباحية في كشف الاستدعاء</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                                        checked={currentShift?.includedInEvening || false}
                                        onChange={e => setCurrentShift({ ...currentShift, includedInEvening: e.target.checked })}
                                    />
                                    <span className="font-bold text-sm text-slate-700 group-hover:text-primary transition-colors">تظهر في الفترة المسائية في كشف الاستدعاء</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                                        checked={currentShift?.countsAsWorkingShift ?? true}
                                        onChange={e => setCurrentShift({ ...currentShift, countsAsWorkingShift: e.target.checked })}
                                    />
                                    <span className="font-bold text-sm text-slate-700 group-hover:text-primary transition-colors">تحتسب كمناوبة عمل فعلية (في التقارير والإحصائيات)</span>
                                </label>
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
                                    className="flex-1 py-4 rounded-2xl bg-primary text-white font-black hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save className="w-5 h-5" />
                                    حفظ البيانات
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
