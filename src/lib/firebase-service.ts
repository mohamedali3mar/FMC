import { db } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { Doctor, RosterRecord } from './types';

const DOCTORS_COLLECTION = 'doctors';
const ROSTERS_COLLECTION = 'rosters';

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
        // Simple client-side filtering since dates are string "YYYY-MM-DD"
        // To be highly optimized, we could use bounds, but fetching the collection is fine for small/medium scale 
        const snapshot = await getDocs(collection(db, ROSTERS_COLLECTION));
        return snapshot.docs
            .map(doc => doc.data() as RosterRecord)
            .filter(r => r.date.startsWith(monthPrefix));
    },
    saveBatch: async (rosters: RosterRecord[], targetMonthPrefix: string): Promise<void> => {
        // First delete existing rosters for the specific month to avoid duplicates
        const snapshot = await getDocs(collection(db, ROSTERS_COLLECTION));
        const toDelete = snapshot.docs.filter(doc => doc.data().date.startsWith(targetMonthPrefix));

        if (toDelete.length > 0) {
            await commitBatches(toDelete, (batch, docSnap: any) => {
                batch.delete(docSnap.ref);
            });
        }

        // Now insert new rosters 
        await commitBatches(rosters, (batch, roster) => {
            const docId = `${roster.date}_${roster.doctorId}_${roster.shiftCode}`;
            const docRef = doc(db, ROSTERS_COLLECTION, docId);
            batch.set(docRef, roster);
        });
    }
};
