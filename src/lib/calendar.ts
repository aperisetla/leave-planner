/**
 * Calendar helper utilities for building monthly and quarterly grid structures.
 */
import {
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isWeekend,
  isSameMonth,
  isWithinInterval,
  parseISO,
  format,
  addMonths,
  startOfQuarter,
  endOfQuarter,
  getQuarter,
  getYear,
} from "date-fns";
import type { LeaveEntry } from "@/types";

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  leaves: LeaveEntry[];
}

export interface CalendarWeek {
  days: CalendarDay[];
}

/** Builds a grid of Mon–Fri weeks only (weekends excluded) for a monthly calendar view. */
export function buildMonthGrid(anchor: Date, entries: LeaveEntry[]): CalendarWeek[] {
  const today = new Date();
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Only keep Mon–Fri
  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd })
    .filter(d => !isWeekend(d));

  const weeks: CalendarWeek[] = [];
  for (let i = 0; i < allDays.length; i += 5) {
    const week = allDays.slice(i, i + 5).map(date => ({
      date,
      isCurrentMonth: isSameMonth(date, anchor),
      isWeekend: false,
      isToday: format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd"),
      leaves: getLeavesForDay(date, entries),
    }));
    if (week.length > 0) weeks.push({ days: week });
  }

  return weeks;
}

/** Returns the three months of the quarter containing `anchor`. */
export function getQuarterMonths(anchor: Date): Date[] {
  const qStart = startOfQuarter(anchor);
  return [qStart, addMonths(qStart, 1), addMonths(qStart, 2)];
}

export function getQuarterLabel(anchor: Date): string {
  return `Q${getQuarter(anchor)} ${getYear(anchor)}`;
}

/** Filters entries that overlap with a given day. */
export function getLeavesForDay(day: Date, entries: LeaveEntry[]): LeaveEntry[] {
  return entries.filter(e => {
    const start = typeof e.startDate === "string" ? parseISO(e.startDate) : e.startDate;
    const end   = typeof e.endDate   === "string" ? parseISO(e.endDate)   : e.endDate;
    try {
      return isWithinInterval(day, { start, end });
    } catch {
      return false;
    }
  });
}

/** Returns all working days (Mon-Fri) in a date range. */
export function countWorkingDays(start: Date, end: Date): number {
  return eachDayOfInterval({ start, end }).filter(d => !isWeekend(d)).length;
}

/** Summarise leave days per member for a given period. */
export function buildMemberSummary(entries: LeaveEntry[], from: Date, to: Date) {
  const map = new Map<string, { member: LeaveEntry["member"]; days: number; entries: LeaveEntry[] }>();

  for (const entry of entries) {
    const start = parseISO(entry.startDate as string);
    const end   = parseISO(entry.endDate as string);
    const clampedStart = start < from ? from : start;
    const clampedEnd   = end   > to   ? to   : end;
    const days = countWorkingDays(clampedStart, clampedEnd);

    if (!map.has(entry.memberId)) {
      map.set(entry.memberId, { member: entry.member, days: 0, entries: [] });
    }
    const rec = map.get(entry.memberId)!;
    rec.days += days;
    rec.entries.push(entry);
  }

  return Array.from(map.values()).sort((a, b) => b.days - a.days);
}
