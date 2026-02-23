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
        // Optimizing query using date range: monthPrefix is YYYY-MM
        const q = query(
            collection(db, ROSTERS_COLLECTION),
            where('date', '>=', monthPrefix),
            where('date', '<=', monthPrefix + '\uf8ff')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as RosterRecord);
    },
    saveBatch: async (rosters: RosterRecord[], targetMonthPrefix: string): Promise<void> => {
        // First delete existing rosters for the specific month to avoid duplicates
        const q = query(
            collection(db, ROSTERS_COLLECTION),
            where('date', '>=', targetMonthPrefix),
            where('date', '<=', targetMonthPrefix + '\uf8ff')
        );
        const snapshot = await getDocs(q);

        if (snapshot.docs.length > 0) {
            await commitBatches(snapshot.docs, (batch, docSnap: any) => {
                batch.delete(docSnap.ref);
            });
        }

        await commitBatches(rosters, (batch, roster) => {
            // Replace any characters that might cause issues in doc IDs (like slashes)
            const sanitizedShiftCode = (roster.shiftCode || 'UNKNOWN').replace(/[\/\s]/g, '_');
            const docId = `${roster.date}_${roster.doctorId}_${sanitizedShiftCode}`;
            const docRef = doc(db, ROSTERS_COLLECTION, docId);
            batch.set(docRef, roster);
        });
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
