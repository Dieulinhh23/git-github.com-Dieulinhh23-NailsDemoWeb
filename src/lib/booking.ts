export type WorkingHour = {
  id: string;
  staff_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export type BusyBooking = { staff_id: string | null; starts_at: string; ends_at: string };

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function formatPrice(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function toDateInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function minutesFromTime(time: string) {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

/** Generates bookable start times for one staff member on one day. */
export function buildSlots(options: {
  date: string;
  durationMinutes: number;
  hours: WorkingHour[];
  busy: BusyBooking[];
  stepMinutes?: number;
}): Date[] {
  const { date, durationMinutes, hours, busy, stepMinutes = 15 } = options;
  const [y, mo, d] = date.split("-").map(Number);
  if (!y || !mo || !d) return [];
  const dayStart = new Date(y, mo - 1, d, 0, 0, 0, 0);
  const weekday = dayStart.getDay();
  const now = new Date();

  const slots: Date[] = [];
  for (const window of hours.filter((h) => h.weekday === weekday)) {
    const open = minutesFromTime(window.start_time);
    const close = minutesFromTime(window.end_time);
    for (let start = open; start + durationMinutes <= close; start += stepMinutes) {
      const slotStart = new Date(dayStart.getTime() + start * 60000);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
      if (slotStart <= now) continue;
      const overlaps = busy.some((b) => {
        const bs = new Date(b.starts_at).getTime();
        const be = new Date(b.ends_at).getTime();
        return slotStart.getTime() < be && slotEnd.getTime() > bs;
      });
      if (!overlaps) slots.push(slotStart);
    }
  }
  return slots.sort((a, b) => a.getTime() - b.getTime());
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
