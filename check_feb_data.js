
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

function getEnv(key) {
    const envPath = path.join(__dirname, '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : null;
}

const firebaseConfig = {
    apiKey: getEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: getEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkFebruaryData() {
    console.log("Checking rosters for February 2026...");
    const rosterRef = collection(db, 'rosters');

    // Check for any record to see date format
    const allSnap = await getDocs(rosterRef);
    console.log(`Total roster records found: ${allSnap.size}`);

    if (allSnap.size > 0) {
        const sample = allSnap.docs[0].data();
        console.log("Sample record date:", sample.date);
    }

    // Specifically check for Feb 2026
    const febPrefix = "2026-02";
    console.log(`Searching for date prefix: ${febPrefix}`);
    const febQuery = query(rosterRef,
        where('date', '>=', febPrefix),
        where('date', '<', '2026-03')
    );

    const febSnap = await getDocs(febQuery);
    console.log(`Found ${febSnap.size} records for February 2026 via range query.`);

    // Check if there are records starting with Arabic numbers or other formats
    const allDocs = await getDocs(rosterRef);
    const febMatches = allDocs.docs.filter(d => {
        const dDate = String(d.data().date);
        return dDate.includes('2026-02') || dDate.includes('2026-2');
    });
    console.log(`Total records containing "2026-02" or "2026-2" manually filtered: ${febMatches.length}`);

    if (febMatches.length > 0) {
        console.log("Top 5 matching records:");
        febMatches.slice(0, 5).forEach(doc => {
            console.log(`Doc ID: ${doc.id}, Date: "${doc.data().date}", Doctor: ${doc.data().doctorId}`);
        });
    }

    process.exit(0);
}

checkFebruaryData().catch(err => {
    console.error(err);
    process.exit(1);
});
