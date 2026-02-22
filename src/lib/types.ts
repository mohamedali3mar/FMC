export type Role = 'admin' | 'viewer';

export type Classification = 'استشاري' | 'أخصائي' | 'طبيب مقيم';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
}

export interface Doctor {
    fingerprintCode: string; // Primary Key
    fullNameArabic: string;
    nationalId?: string;
    phoneNumber: string;
    classification: Classification;
    classificationRank: 1 | 2 | 3; // 1 for Consultant, 2 for Specialist, 3 for Resident
    specialty: string;
    department: string;
    isActive: boolean;
}

export interface ShiftType {
    code: string; // e.g., 24H, 18A, 7P
    name: string;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    durationHours: number;
    includedInMorning: boolean;
    includedInEvening: boolean;
    countsAsWorkingShift: boolean;
}

export interface RosterRecord {
    id: string; // Internal unique ID
    doctorId: string; // Reference to fingerprintCode
    department?: string; // Standardized department
    date: string; // ISO format date (YYYY-MM-DD)
    shiftCode: string; // Reference to ShiftType code
    source: 'ExcelUpload' | 'ManualEdit';
    lastModifiedBy: string; // User ID
    lastModifiedAt: string; // ISO timestamp
}

export interface DailyCallSheetSection {
    title: string;
    specialties: {
        name: string;
        doctors: (Doctor & { shiftCode: string })[];
    }[];
}

export interface DashboardAlert {
    id: string;
    type: 'missing_doctor' | 'conflict' | 'system';
    message: string;
    details?: string;
    relatedId?: string; // e.g., missing fingerprint code
    metadata?: {
        doctorName?: string;
        specialty?: string;
    };
    createdAt: string;
    isRead: boolean;
}
