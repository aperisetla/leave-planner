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
  format,
  addMonths,
  startOfQuarter,
  endOfQuarter,
  getQuarter,
  getYear,
  parseISO,
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

/**
 * Converts a UTC Date to an IST date string (YYYY-MM-DD).
 * IST = UTC + 5:30. Used so entries stored as "prev-day 18:30 UTC"
 * (= midnight IST) are placed on the correct IST calendar day.
 */
function toISTDateStr(d: Date): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  return format(new Date(d.getTime() + IST_OFFSET_MS), "yyyy-MM-dd");
}

/** Filters entries that overlap with a given day (compares as IST date strings). */
export function getLeavesForDay(day: Date, entries: LeaveEntry[]): LeaveEntry[] {
  // dayStr: format in IST so it matches how entries are stored (IST midnight = 18:30 UTC prev day)
  const dayStr = toISTDateStr(day);
  return entries.filter(e => {
    const startD = typeof e.startDate === "string" ? new Date(e.startDate) : e.startDate;
    const endD   = typeof e.endDate   === "string" ? new Date(e.endDate)   : e.endDate;
    const startStr = toISTDateStr(startD);
    const endStr   = toISTDateStr(endD);
    return dayStr >= startStr && dayStr <= endStr;
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
