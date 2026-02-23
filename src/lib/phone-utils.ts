/**
 * Normalizes Egyptian mobile phone numbers.
 * Common issue: Excel or manual entry stripping the leading '0'.
 * Example: '1008694906' -> '01008694906'
 */
export function normalizeEgyptianPhone(phone: string): string {
    if (!phone) return '';

    // Trim and remove any non-numeric characters except +
    let normalized = phone.trim().replace(/[^\d+]/g, '');

    // If it starts with '1' and has 10 digits, it's a mobile number missing the '0'
    if (normalized.length === 10 && normalized.startsWith('1')) {
        normalized = '0' + normalized;
    }

    // Handle international format +20
    if (normalized.startsWith('+20') && normalized.length === 13) {
        normalized = '0' + normalized.substring(3);
    } else if (normalized.startsWith('20') && normalized.length === 12) {
        normalized = '0' + normalized.substring(2);
    }

    return normalized;
}

/**
 * Validates if the phone number follows Egyptian mobile format (01XXXXXXXXX)
 */
export function isValidEgyptianMobile(phone: string): boolean {
    const normalized = normalizeEgyptianPhone(phone);
    return /^01[0125][0-9]{8}$/.test(normalized);
}
