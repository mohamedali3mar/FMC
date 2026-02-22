import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
    const d = new Date(date);
    return new Intl.DateTimeFormat('ar-EG', {
        dateStyle: 'full',
    }).format(d);
}

export function getCurrentDateISO(): string {
    return new Date().toISOString().split('T')[0];
}
