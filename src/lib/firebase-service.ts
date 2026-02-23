import { db } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { Doctor, RosterRecord, ShiftType } from './types';

const DOCTORS_COLLECTION = 'doctors';
const ROSTERS_COLLECTION = 'rosters';
const SHIFTS_COLLECTION = 'shifts';

// Helper to commit batches in chunks of 500
async function commitBatches(items: any[], setRefCallback: (batch: any, item: any) => void) {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(item => setRefCallback(batch, item));
        await batch.commit();
    }
}

export const doctorService = {
    getAll: async (): Promise<Doctor[]> => {
        const snapshot = await getDocs(collection(db, DOCTORS_COLLECTION));
        return snapshot.docs.map(doc => doc.data() as Doctor);
    },
    save: async (doctor: Doctor): Promise<void> => {
        await setDoc(doc(db, DOCTORS_COLLECTION, doctor.fingerprintCode), doctor);
    },
    delete: async (fingerprintCode: string): Promise<void> => {
        await deleteDoc(doc(db, DOCTORS_COLLECTION, fingerprintCode));
    },
    saveBatch: async (doctors: Doctor[]): Promise<void> => {
        await commitBatches(doctors, (batch, doctor) => {
            const docRef = doc(db, DOCTORS_COLLECTION, doctor.fingerprintCode);
            batch.set(docRef, doctor);
        });
    }
};

export const rosterService = {
    getAll: async (): Promise<RosterRecord[]> => {
        const snapshot = await getDocs(collection(db, ROSTERS_COLLECTION));
        return snapshot.docs.map(doc => doc.data() as RosterRecord);
    },
    getByMonth: async (monthPrefix: string): Promise<RosterRecord[]> => {
        // monthPrefix is YYYY-MM
        // A more robust range query: from YYYY-MM to the beginning of the next month
        const nextMonth = (monthStr: string) => {
            const [year, month] = monthStr.split('-').map(Number);
            if (month === 12) return `${year + 1}-01`;
            return `${year}-${String(month + 1).padStart(2, '0')}`;
        };
        const nextPrefix = nextMonth(monthPrefix);

        const q = query(
            collection(db, ROSTERS_COLLECTION),
            where('date', '>=', monthPrefix),
            where('date', '<', nextPrefix)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as RosterRecord);
    },
    saveBatch: async (rosters: RosterRecord[], targetMonthPrefix: string): Promise<void> => {
        // 1. Identify unique doctors in this batch
        const doctorIds = Array.from(new Set(rosters.map(r => r.doctorId)));

        // 2. Surgical deletion: Only delete existing records for THESE doctors in THIS month
        // This allows partial uploads (e.g. by department) without wiping the whole month
        const nextMonth = (monthStr: string) => {
            const [year, month] = monthStr.split('-').map(Number);
            if (month === 12) return `${year + 1}-01`;
            return `${year}-${String(month + 1).padStart(2, '0')}`;
        };
        const nextPrefix = nextMonth(targetMonthPrefix);

        // Fetch existing records for these doctors
        // Firestore 'in' operator supports up to 30 values. We chunk the doctors.
        const CHUNK_SIZE_IN = 30;
        for (let i = 0; i < doctorIds.length; i += CHUNK_SIZE_IN) {
            const chunk = doctorIds.slice(i, i + CHUNK_SIZE_IN);
            const q = query(
                collection(db, ROSTERS_COLLECTION),
                where('doctorId', 'in', chunk),
                where('date', '>=', targetMonthPrefix),
                where('date', '<', nextPrefix)
            );
            const snapshot = await getDocs(q);
            if (snapshot.docs.length > 0) {
                const deleteBatch = writeBatch(db);
                snapshot.docs.forEach(d => deleteBatch.delete(d.ref));
                await deleteBatch.commit();
            }
        }

        // 3. Save new records with stable ID (date_doctorId)
        await commitBatches(rosters, (batch, roster) => {
            // FORCE stable ID: one doctor can only have one shift per day in this logic
            // This prevents duplicates on re-upload
            const docId = `${roster.date}_${roster.doctorId}`;
            const docRef = doc(db, ROSTERS_COLLECTION, docId);
            batch.set(docRef, { ...roster, id: docId });
        });
    },
    save: async (roster: RosterRecord): Promise<void> => {
        // 1. Surgical cleanup: Delete any existing records for THIS doctor on THIS specific date
        // (Handles both stable IDs and legacy IDs that included shiftCode)
        const q = query(
            collection(db, ROSTERS_COLLECTION),
            where('doctorId', '==', roster.doctorId),
            where('date', '==', roster.date)
        );
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);

        if (snapshot.docs.length > 0) {
            snapshot.docs.forEach(d => batch.delete(d.ref));
        }

        // 2. Save the new record with stable ID
        const docId = `${roster.date}_${roster.doctorId}`;
        const docRef = doc(db, ROSTERS_COLLECTION, docId);
        batch.set(docRef, { ...roster, id: docId });

        await batch.commit();
    },
    delete: async (id: string): Promise<void> => {
        await deleteDoc(doc(db, ROSTERS_COLLECTION, id));
    },
    cleanupDuplicates: async (monthPrefix?: string): Promise<{ deleted: number }> => {
        // 1. Fetch records (Filter by month if prefix provided)
        let snapshot;
        if (monthPrefix) {
            const nextMonth = (monthStr: string) => {
                const [year, month] = monthStr.split('-').map(Number);
                if (month === 12) return `${year + 1}-01`;
                return `${year}-${String(month + 1).padStart(2, '0')}`;
            };
            const nextPrefix = nextMonth(monthPrefix);
            const q = query(
                collection(db, ROSTERS_COLLECTION),
                where('date', '>=', monthPrefix),
                where('date', '<', nextPrefix)
            );
            snapshot = await getDocs(q);
        } else {
            snapshot = await getDocs(collection(db, ROSTERS_COLLECTION));
        }

        const allRosters = snapshot.docs.map(d => d.data() as RosterRecord);

        // 2. Group by (Date + Doctor)
        const groups = new Map<string, RosterRecord[]>();
        allRosters.forEach(r => {
            const key = `${r.date}_${r.doctorId}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(r);
        });

        let deletedCount = 0;
        const toDeleteIds: string[] = [];

        for (const [key, records] of groups.entries()) {
            if (records.length > 1) {
                // Determine the winner to keep
                let winner = records.find(r => r.id === key);
                if (!winner) {
                    winner = [...records].sort((a, b) =>
                        new Date(b.lastModifiedAt || 0).getTime() - new Date(a.lastModifiedAt || 0).getTime()
                    )[0];
                }

                records.forEach(r => {
                    if (r.id !== winner!.id) {
                        toDeleteIds.push(r.id);
                    }
                });
            }
        }

        // 3. Batch delete in chunks of 450
        if (toDeleteIds.length > 0) {
            for (let i = 0; i < toDeleteIds.length; i += 450) {
                const chunk = toDeleteIds.slice(i, i + 450);
                const batch = writeBatch(db);
                chunk.forEach(id => {
                    batch.delete(doc(db, ROSTERS_COLLECTION, id));
                });
                await batch.commit();
                deletedCount += chunk.length;
            }
        }

        return { deleted: deletedCount };
    }
};

export const shiftService = {
    getAll: async (): Promise<ShiftType[]> => {
        const snapshot = await getDocs(collection(db, SHIFTS_COLLECTION));
        return snapshot.docs.map(doc => doc.data() as ShiftType);
    },
    saveBatch: async (shifts: ShiftType[]): Promise<void> => {
        await commitBatches(shifts, (batch, shift: ShiftType) => {
            const docRef = doc(db, SHIFTS_COLLECTION, shift.code);
            batch.set(docRef, shift);
        });
    },
    save: async (shift: ShiftType): Promise<void> => {
        await setDoc(doc(db, SHIFTS_COLLECTION, shift.code), shift);
    },
    delete: async (code: string): Promise<void> => {
        await deleteDoc(doc(db, SHIFTS_COLLECTION, code));
    }
};
