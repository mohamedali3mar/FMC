import { Doctor, ShiftType, RosterRecord, User } from './types';

export const mockUsers: User[] = [
    {
        id: 'u1',
        name: 'المسؤول الرئيسي',
        email: 'admin@hospital.com',
        role: 'admin',
        isActive: true,
    },
    {
        id: 'u2',
        name: 'مشاهد البيانات',
        email: 'viewer@hospital.com',
        role: 'viewer',
        isActive: true,
    },
];

export const mockShiftTypes: ShiftType[] = [
    {
        code: '24H',
        name: 'شفت 24 ساعة',
        startTime: '08:00',
        endTime: '08:00',
        durationHours: 24,
        includedInMorning: true,
        includedInEvening: true,
        countsAsWorkingShift: true,
    },
    {
        code: '18A',
        name: 'صباحي 18 ساعة تعاقد',
        startTime: '08:00',
        endTime: '02:00',
        durationHours: 18,
        includedInMorning: true,
        includedInEvening: true,
        countsAsWorkingShift: true,
    },
    {
        code: '18P',
        name: 'مسائي 18 ساعة تعاقد',
        startTime: '20:00',
        endTime: '14:00',
        durationHours: 18,
        includedInMorning: true,
        includedInEvening: true,
        countsAsWorkingShift: true,
    },
    {
        code: '12A',
        name: 'صباحي 12 ساعة',
        startTime: '08:00',
        endTime: '20:00',
        durationHours: 12,
        includedInMorning: true,
        includedInEvening: false,
        countsAsWorkingShift: true,
    },
    {
        code: '12P',
        name: 'مسائي 12 ساعة',
        startTime: '20:00',
        endTime: '08:00',
        durationHours: 12,
        includedInMorning: false,
        includedInEvening: true,
        countsAsWorkingShift: true,
    },
    {
        code: '7A',
        name: 'عمل يومي 7 ساعات صباحاً',
        startTime: '08:00',
        endTime: '15:00',
        durationHours: 7,
        includedInMorning: true,
        includedInEvening: false,
        countsAsWorkingShift: true,
    },
    {
        code: '7P',
        name: 'عمل يومي 7 ساعات مساءً',
        startTime: '15:00',
        endTime: '22:00',
        durationHours: 7,
        includedInMorning: false,
        includedInEvening: true,
        countsAsWorkingShift: true,
    }
];

export const mockDoctors: Doctor[] = [
    {
        fingerprintCode: 'D001',
        fullNameArabic: 'د. أحمد محمد علي',
        nationalId: '1234567890',
        phoneNumber: '0501234567',
        classification: 'استشاري',
        classificationRank: 1,
        specialty: 'الجراحة العامة',
        department: 'الجراحة',
        isActive: true,
    },
    {
        fingerprintCode: 'D002',
        fullNameArabic: 'د. سارة محمود حسن',
        nationalId: '2345678901',
        phoneNumber: '0502345678',
        classification: 'أخصائي',
        classificationRank: 2,
        specialty: 'الأطفال',
        department: 'الأطفال',
        isActive: true,
    },
    {
        fingerprintCode: 'D003',
        fullNameArabic: 'د. خالد وليد السعيد',
        nationalId: '3456789012',
        phoneNumber: '0503456789',
        classification: 'طبيب مقيم',
        classificationRank: 3,
        specialty: 'الجراحة العامة',
        department: 'الجراحة',
        isActive: true,
    },
    {
        fingerprintCode: 'D004',
        fullNameArabic: 'د. منى إبراهيم حلمي',
        nationalId: '4567890123',
        phoneNumber: '0504567890',
        classification: 'استشاري',
        classificationRank: 1,
        specialty: 'الباطنية',
        department: 'الباطنية',
        isActive: true,
    },
];

export const mockRoster: RosterRecord[] = [
    // Today's Shifts
    {
        id: 'r1',
        doctorId: 'D001',
        date: new Date().toISOString().split('T')[0],
        shiftCode: '24H',
        source: 'ManualEdit',
        lastModifiedBy: 'u1',
        lastModifiedAt: new Date().toISOString(),
    },
    {
        id: 'r2',
        doctorId: 'D002',
        date: new Date().toISOString().split('T')[0],
        shiftCode: '7A',
        source: 'ManualEdit',
        lastModifiedBy: 'u1',
        lastModifiedAt: new Date().toISOString(),
    },
    {
        id: 'r3',
        doctorId: 'D004',
        date: new Date().toISOString().split('T')[0],
        shiftCode: '18P',
        source: 'ManualEdit',
        lastModifiedBy: 'u1',
        lastModifiedAt: new Date().toISOString(),
    },
    // Past Shifts this month for stats
    ...Array.from({ length: 15 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (i + 1));
        const dateStr = d.toISOString().split('T')[0];
        const doctorIds = ['D001', 'D002', 'D003', 'D004'];
        const shiftCodes = ['24H', '7A', '7P', '12A', '12P', '18A', '18P'];

        return {
            id: `past-${i}`,
            doctorId: doctorIds[i % 4],
            date: dateStr,
            shiftCode: shiftCodes[i % shiftCodes.length],
            source: 'ExcelUpload' as const,
            lastModifiedBy: 'u1',
            lastModifiedAt: d.toISOString(),
        };
    })
];
