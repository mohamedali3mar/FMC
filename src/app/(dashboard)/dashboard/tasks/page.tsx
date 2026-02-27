'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { AlertTriangle, UserPlus, CheckCircle2, Trash2, Bell, AlertCircle } from 'lucide-react';
import { alertsApi } from '@/lib/alerts';
import { DashboardAlert } from '@/lib/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function AdminTasksPage() {
    const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
    const router = useRouter();

    const loadAlerts = () => {
        setAlerts(alertsApi.getAlerts().filter(a => !a.isRead));
    };

    useEffect(() => {
        loadAlerts();
    }, []);

    const handleDismissAlert = (id: string) => {
        alertsApi.markAsRead(id);
        loadAlerts();
    };

    const handleDismissDoctorAlerts = (relatedId: string) => {
        alertsApi.markAsReadByRelatedId(relatedId);
        loadAlerts();
    };

    const handleClearAll = () => {
        if (confirm('هل أنت متأكد من مسح جميع المهام؟')) {
            alerts.forEach(a => alertsApi.markAsRead(a.id));
            loadAlerts();
        }
    };

    // Group alerts by relatedId (typically the doctor's fingerprint code)
    // If relatedId is missing, group under 'other'
    const groupedAlerts = alerts.reduce((acc, alert) => {
        const groupId = alert.relatedId || 'other';
        if (!acc[groupId]) {
            acc[groupId] = {
                doctorId: groupId,
                doctorName: alert.metadata?.doctorName || 'طبيب غير محدد',
                specialty: alert.metadata?.specialty || '',
                department: alert.metadata?.department || '',
                alerts: []
            };
        }
        acc[groupId].alerts.push(alert);
        return acc;
    }, {} as Record<string, { doctorId: string; doctorName: string; specialty: string; department: string; alerts: DashboardAlert[] }>);

    const groups = Object.values(groupedAlerts).sort((a, b) => b.alerts.length - a.alerts.length);

    return (
        <div className="space-y-6">
            <PageHeader
                title="المهام العاجلة للمسؤول"
                subtitle="متابعة النواقص والتعارضات التي تتطلب تدخلاً"
            />

            {groups.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[40vh]">
                    <div className="bg-emerald-50 text-emerald-500 p-4 rounded-full mb-4">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">النظام يعمل بامتياز!</h3>
                    <p className="text-slate-500 font-medium">لا توجد أي مهام عاجلة تتطلب تدخلاً من المسؤول في الوقت الحالي.</p>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex justify-end">
                        <button
                            onClick={handleClearAll}
                            className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-100 transition-all font-mono"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>مسح جميع المهام</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groups.map((group) => (
                            <div key={group.doctorId} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                                <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-black text-lg text-slate-900 line-clamp-1">{group.doctorName}</h3>
                                        {group.doctorId !== 'other' && (
                                            <p className="text-xs text-slate-500 font-bold mt-0.5">كود: <span dir="ltr">{group.doctorId}</span></p>
                                        )}
                                    </div>
                                    <div className="bg-amber-100 text-amber-700 font-black text-xs px-2.5 py-1 rounded-lg">
                                        {group.alerts.length} مشكلة
                                    </div>
                                </div>

                                <div className="flex-1 p-4 space-y-4">
                                    {group.alerts.map((alert, idx) => (
                                        <div key={alert.id} className={cn(
                                            "flex items-start gap-3 pb-4",
                                            idx !== group.alerts.length - 1 && "border-b border-slate-100"
                                        )}>
                                            <div className={cn(
                                                "p-1.5 rounded-lg shrink-0 mt-0.5",
                                                alert.type === 'conflict' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                                            )}>
                                                {alert.type === 'conflict' ? <AlertCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={cn(
                                                        "text-sm font-black leading-tight",
                                                        alert.type === 'conflict' ? "text-red-900" : "text-amber-900"
                                                    )}>{alert.message}</p>
                                                </div>
                                                {alert.details && (
                                                    <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed bg-slate-50 p-2 rounded-lg">{alert.details}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex gap-2">
                                    {group.alerts.some(a => a.type === 'missing_doctor') && group.doctorId !== 'other' && (
                                        <Link
                                            href={`/dashboard/doctors?code=${group.doctorId}&name=${encodeURIComponent(group.doctorName || '')}&specialty=${encodeURIComponent(group.specialty || '')}&dept=${encodeURIComponent(group.department || '')}`}
                                            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-sm"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            <span>تسجيل الطبيب</span>
                                        </Link>
                                    )}
                                    <button
                                        onClick={() => handleDismissDoctorAlerts(group.doctorId)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>تجاهل المشاكل</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
