import { ShiftType, RosterRecord } from './types';
import { parse, addDays, differenceInHours, isBefore, isAfter, isEqual } from 'date-fns';

export interface ShiftTimeRange {
    start: Date;
    end: Date;
    shiftCode: string;
}

/**
 * Calculates the actual Start and End Dates for a given shift assignment.
 * Properly handles shifts that cross over midnight (e.g., 8 PM to 8 AM next day).
 */
export function getShiftTimes(dateStr: string, shift: ShiftType): { start: Date; end: Date } {
    const baseDate = parse(dateStr, 'yyyy-MM-dd', new Date());

    // Create start Date
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const startDate = new Date(baseDate);
    startDate.setHours(startH, startM, 0, 0);

    // Create end Date
    const [endH, endM] = shift.endTime.split(':').map(Number);
    let endDate = new Date(baseDate);
    endDate.setHours(endH, endM, 0, 0);

    // If end time is before or equal to start time, it means it crosses midnight
    // (Unless duration is exactly 24h, in which case it definitely crosses midnight or ends at start time next day)
    const isOvernight = isBefore(endDate, startDate) || isEqual(endDate, startDate) || shift.durationHours > 12;

    if (isOvernight && shift.durationHours > 0) {
        // Most common case: it ends on the next day
        // Special case: 24h shift ends exactly at the same time next day
        endDate = addDays(endDate, 1);
    }

    return { start: startDate, end: endDate };
}

export interface ShiftConflict {
    type: 'overlap' | 'insufficient_rest';
    doctorName?: string;
    date: string;
    gapHours: number;
    message: string;
}

/**
 * Validates a sequence of shifts for a single doctor to ensure 6-hour rest rule.
 */
export function detectShiftConflicts(
    roster: RosterRecord[],
    shifts: ShiftType[]
): ShiftConflict[] {
    const conflicts: ShiftConflict[] = [];

    // Sort assignments by date/time
    const sortedAssignments = [...roster].sort((a, b) => a.date.localeCompare(b.date));

    // Process pairs of consecutive assignments
    for (let i = 0; i < sortedAssignments.length - 1; i++) {
        const currentRef = sortedAssignments[i];
        const nextRef = sortedAssignments[i + 1];

        const currentType = shifts.find(s => s.code.toUpperCase() === currentRef.shiftCode.toUpperCase());
        const nextType = shifts.find(s => s.code.toUpperCase() === nextRef.shiftCode.toUpperCase());

        if (!currentType || !nextType) continue;
        if (!currentType.countsAsWorkingShift || !nextType.countsAsWorkingShift) continue;

        const currentTimes = getShiftTimes(currentRef.date, currentType);
        const nextTimes = getShiftTimes(nextRef.date, nextType);

        // Calculate gap
        const gap = differenceInHours(nextTimes.start, currentTimes.end);

        if (gap < 0) {
            conflicts.push({
                type: 'overlap',
                date: nextRef.date,
                gapHours: gap,
                message: `تضارب مباشر: الوردية تبدأ قبل انتهاء الوردية السابقة.`
            });
        } else if (gap < 6) {
            conflicts.push({
                type: 'insufficient_rest',
                date: nextRef.date,
                gapHours: gap,
                message: `مخالفة قاعدة الراحة: الفاصل بين الورديتين ${gap} ساعة فقط (المطلوب 6 ساعات).`
            });
        }
    }

    return conflicts;
}
