import { db } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
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
        const snapshot = await getDocs(collection(db, ROSTERS_COLLECTION));
        return snapshot.docs
            .map(doc => doc.data() as RosterRecord)
            .filter(r => r.date.startsWith(monthPrefix));
    },
    saveBatch: async (rosters: RosterRecord[], targetMonthPrefix: string): Promise<void> => {
        const snapshot = await getDocs(collection(db, ROSTERS_COLLECTION));
        const toDelete = snapshot.docs.filter(doc => (doc.data() as RosterRecord).date.startsWith(targetMonthPrefix));

        if (toDelete.length > 0) {
            await commitBatches(toDelete, (batch, docSnap: any) => {
                batch.delete(docSnap.ref);
            });
        }

        await commitBatches(rosters, (batch, roster) => {
            const docId = `${roster.date}_${roster.doctorId}_${roster.shiftCode}`;
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
