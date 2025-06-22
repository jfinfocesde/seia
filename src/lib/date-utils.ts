/**
 * Utility functions for date and time operations
 */

/**
 * Gets the current date and time in UTC
 * @returns Current date and time as a Date object
 */
export function nowUTC(): Date {
  return new Date();
}

/**
 * Converts a date string or Date object to UTC
 * @param date - The date string or Date object to convert
 * @returns Date object in UTC
 */
export function toUTC(date: string | Date): Date {
  return date instanceof Date ? date : new Date(date);
}

/**
 * Checks if a date is before another date in UTC
 * @param date1 - The first date to compare
 * @param date2 - The second date to compare
 * @returns True if date1 is before date2, false otherwise
 */
export function isBeforeUTC(date1: Date, date2: Date | string): boolean {
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  return date1.getTime() < d2.getTime();
}

/**
 * Checks if a date is after another date in UTC
 * @param date1 - The first date to compare
 * @param date2 - The second date to compare
 * @returns True if date1 is after date2, false otherwise
 */
export function isAfterUTC(date1: Date, date2: Date | string): boolean {
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  return date1.getTime() > d2.getTime();
}

/**
 * Formats the time remaining between two dates or from a millisecond value
 * @param endDateOrMillis - The end date, or milliseconds remaining
 * @param startDate - The start date (defaults to current date, ignored if endDateOrMillis is a number)
 * @returns Formatted string with time remaining
 */
export function formatTimeRemaining(endDateOrMillis: Date | string | number, startDate: Date | string = new Date()): string {
  let timeDiff: number;
  
  if (typeof endDateOrMillis === 'number') {
    // If endDateOrMillis is already milliseconds
    timeDiff = endDateOrMillis;
  } else {
    // If endDateOrMillis is a Date or string
    const end = endDateOrMillis instanceof Date ? endDateOrMillis : new Date(endDateOrMillis);
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    timeDiff = end.getTime() - start.getTime();
  }
  
  if (timeDiff <= 0) {
    return "Tiempo agotado";
  }
  
  // Calculate hours, minutes, and seconds
  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
  
  // Format the time remaining
  const formattedHours = hours > 0 ? `${hours}h ` : "";
  const formattedMinutes = minutes > 0 ? `${minutes}m ` : "";
  const formattedSeconds = `${seconds}s`;
  
  return `${formattedHours}${formattedMinutes}${formattedSeconds}`;
}