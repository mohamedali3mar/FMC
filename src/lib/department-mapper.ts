export interface DepartmentMapping {
    canonicalName: string;
    englishName: string;
    aliases: string[];
}

export const DEPARTMENTS_MAPPING: DepartmentMapping[] = [
    { canonicalName: "العناية المركزة", englishName: "ICU", aliases: ["icu", "الرعاية المركزة", "الرعايه المركزه", "العنايه المركزيه", "رعاية حرجة", "طب حالات حرجة", "عناية مركزة", "عناية مركزة اطفال"] },
    { canonicalName: "الأشعة التشخيصية", englishName: "Radiology", aliases: ["الاشعة التشخيصية", "الاشعة التشخيصية ", "الاشعه التشخصيه", "اشعة تشخيصية"] },
    { canonicalName: "الأطفال", englishName: "Pediatrics", aliases: ["الأطفال", "الاطفال", "الاطفال "] },
    { canonicalName: "الأنف والأذن والحنجرة", englishName: "ENT", aliases: ["الانف والاذن والحنجره", "جراحة انف واذن وحنجرة"] },
    { canonicalName: "الأورام", englishName: "Oncology", aliases: ["الاورام", "الأورام", "طب الاورام", "جراحة اورام"] },
    { canonicalName: "الباطنة العامة", englishName: "Internal Medicine", aliases: ["الباطنه العامه", "باطنة عامة"] },
    { canonicalName: "التخاطب", englishName: "Speech Therapy", aliases: ["التخاطب"] },
    { canonicalName: "التخدير", englishName: "Anesthesia", aliases: ["التخدير", "تخدير"] },
    { canonicalName: "التدريب", englishName: "Training", aliases: ["التدريب"] },
    { canonicalName: "الجراحة العامة", englishName: "General Surgery", aliases: ["الجراحة العامة", "جراحة عامة"] },
    { canonicalName: "الجلدية", englishName: "Dermatology", aliases: ["الجلدية", "الجلديه", "الجلديه ", "جلدية وتناسلية"] },
    { canonicalName: "الحضانات", englishName: "NICU", aliases: ["الحضانات", "الحضانة", "الحضانه", "اطفال مبتسرين"] },
    { canonicalName: "الداخلي", englishName: "Inpatient", aliases: ["الداخلى", "الداخلى ", "الداخلي"] },
    { canonicalName: "الروماتيزم", englishName: "Rheumatology", aliases: ["الروماتزم", "امراض روماتيزمية"] },
    { canonicalName: "الطوارئ", englishName: "ER", aliases: ["الطوارئ", "الطوارىء", "الطواريء", "طوارئ"] },
    { canonicalName: "طوارئ العظام", englishName: "Orthopedic ER", aliases: ["طوارئ عظام"] },
    { canonicalName: "العلاج الطبيعي", englishName: "Physiotherapy", aliases: ["العلاج الطبيعى", "العلاج الطبيعى ", "العلاج الطبيعي"] },
    { canonicalName: "العمليات", englishName: "OR", aliases: ["العمليات"] },
    { canonicalName: "الغسيل الكلوي", englishName: "Hemodialysis", aliases: ["الغسيل الكلوى", "غسيل كلوى"] },
    { canonicalName: "القلب", englishName: "Cardiology", aliases: ["القلب", "قلب واوعية", "ايكو قلب اطفال"] },
    { canonicalName: "الكلى", englishName: "Nephrology", aliases: ["الكلى", "الكلى ", "امراض كلى"] },
    { canonicalName: "النساء والتوليد", englishName: "Obstetrics/Gynecology", aliases: ["النسا", "نساء و توليد", "نسا وتوليد"] },
    { canonicalName: "المخ والأعصاب", englishName: "Neurology/Neurosurgery", aliases: ["أمراض المخ والأعصاب", "جراحة مخ واعصاب", "امراض عصبية", "امراض نفسية و عصبية"] },
    { canonicalName: "بنك الدم", englishName: "Blood Bank", aliases: ["بنك الدم", "بنك الدم "] },
    { canonicalName: "جراحة أطفال", englishName: "Pediatric Surgery", aliases: ["جراحة أطفال"] },
    { canonicalName: "جراحة التجميل", englishName: "Plastic Surgery", aliases: ["جراحة التجميل", "جراحة تجميل و حروق"] },
    { canonicalName: "جراحة أوعية دموية", englishName: "Vascular Surgery", aliases: ["جراحة اوعية دموية"] },
    { canonicalName: "جراحة العظام", englishName: "Orthopedics", aliases: ["جراحة عظام", "جراحة العظام"] },
    { canonicalName: "جراحة القلب والصدر", englishName: "Cardiothoracic Surgery", aliases: ["جراحة قلب وصدر", "جراحة قلب و صدر"] },
    { canonicalName: "جراحة المسالك البولية", englishName: "Urology", aliases: ["جراحة مسالك"] },
    { canonicalName: "جراحة الوجه والفكين", englishName: "Maxillofacial Surgery", aliases: ["جراحه الوجه والفكين", "جراحة وجه وفكين"] },
    { canonicalName: "الجهاز الهضمي", englishName: "Gastroenterology", aliases: ["جهاز هضمي", "جهاز هضمى", "جهاز هضمى وكبد"] },
    { canonicalName: "طب وجراحة العيون", englishName: "Ophthalmology", aliases: ["طب و جراحة العيون", "طب وجراحة العيون"] },
    { canonicalName: "المناظير", englishName: "Endoscopy", aliases: ["مناظير", "مناظير الجراحة", "مناظير المفاصل"] },
    // A few other specialties might come through, map them explicitly:
    { canonicalName: "أمراض السمعيات", englishName: "Audiology", aliases: ["امراض السمعيات"] },
    { canonicalName: "الأشعة العلاجية والطب النووي", englishName: "Radiotherapy", aliases: ["الاشعة العلاجية والطب النووى"] },
    { canonicalName: "الباثولوجيا الإكلينيكية", englishName: "Clinical Pathology", aliases: ["باثولوجيا اكلينيكية"] },
    { canonicalName: "الغدد الصماء", englishName: "Endocrinology", aliases: ["غدد صماء"] },
];

export function normalizeArabicText(text: string): string {
    if (!text) return '';
    return text.trim()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ي/g, 'ى')
        .replace(/\s+/g, ' ')
        .toLowerCase(); // lowercasing helps with "icu"
}

export function standardizeDepartment(rawDeptName: string | undefined): { canonical: string, english: string, isRecognized: boolean, raw: string } {
    if (!rawDeptName || !rawDeptName.trim()) {
        return { canonical: '', english: '', isRecognized: false, raw: '' };
    }

    const normalizedRaw = normalizeArabicText(rawDeptName);

    for (const mapping of DEPARTMENTS_MAPPING) {
        if (normalizeArabicText(mapping.canonicalName) === normalizedRaw) return { canonical: mapping.canonicalName, english: mapping.englishName, isRecognized: true, raw: rawDeptName };
        if (mapping.englishName.toLowerCase() === normalizedRaw) return { canonical: mapping.canonicalName, english: mapping.englishName, isRecognized: true, raw: rawDeptName };

        for (const alias of mapping.aliases) {
            if (normalizeArabicText(alias) === normalizedRaw) {
                return { canonical: mapping.canonicalName, english: mapping.englishName, isRecognized: true, raw: rawDeptName };
            }
        }
    }

    // Unrecognized
    return { canonical: rawDeptName.trim(), english: 'Unknown', isRecognized: false, raw: rawDeptName.trim() };
}
