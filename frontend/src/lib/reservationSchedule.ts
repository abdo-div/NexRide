/** Pickup/return times are Libya local time, independently of the visitor's zone. */
export const reservationInstant = (date: string, time: string): string => {
  const match = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(time.trim());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !match) throw new Error("Invalid reservation date or time");
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (minute > 59 || (period ? hour < 1 || hour > 12 : hour > 23)) throw new Error("Invalid reservation time");
  if (period) hour = hour % 12 + (period === "PM" ? 12 : 0);
  // Libya uses UTC+02:00 without daylight saving time.
  const local = `${date}T${String(hour).padStart(2, "0")}:${match[2]}:00+02:00`;
  const instant = new Date(local);
  if (Number.isNaN(instant.getTime()) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new Error("Invalid reservation date");
  }
  return instant.toISOString();
};

export const reservationSchedule = (startDate: string, endDate: string, startTime: string, endTime: string) => {
  const start = reservationInstant(startDate, startTime);
  const end = reservationInstant(endDate, endTime);
  const duration = Date.parse(end) - Date.parse(start);
  if (duration <= 0) throw new Error("Return date and time must be after pickup");
  return { start, end, days: Math.ceil(duration / 86400000) };
};

export const formatReservationDate = (value: string, language: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language, {
    timeZone: "Africa/Tripoli", day: "numeric", month: "short", year: "numeric",
  }).format(date);
};
