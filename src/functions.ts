import { interchanges, nationalHolidays } from './config';

/**
 * Validates the number plate format (LLL-NNN).
 * @param numberPlate
 * @returns Boolean
 */
export const isValidNumberPlate = (numberPlate: string): boolean => {
  const regex = /^[A-Z]{3}-\d{3}$/;
  return regex.test(numberPlate);
};

/**
 * Calculates the distance between two interchanges.
 * @param entryInterchange
 * @param exitInterchange
 * @returns distance
 */
export const calculateDistance = (entryInterchange: string, exitInterchange: string): number => {
  const entryDistance = interchanges[entryInterchange];
  const exitDistance = interchanges[exitInterchange];

  if (entryDistance === undefined || exitDistance === undefined) {
    throw new Error('Invalid interchange name(s) provided.');
  }

  return Math.abs(entryDistance - exitDistance);
};

/**
 * Checks if a given date is a weekend (Saturday or Sunday).
 * @param date
 * @returns Boolean
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

/**
 * Checks if a given date is a national holiday.
 * @param date
 * @returns Boolean
 */
export const isNationalHoliday = (date: Date): boolean => {
  const monthDay = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  return nationalHolidays.includes(monthDay);
};

/**
 * Determines if a number plate qualifies for a discount based on the day of the week.
 * @param numberPlate
 * @param entryDate
 * @returns Boolean
 */
export const appliesNumberPlateDiscount = (numberPlate: string, entryDate: Date): boolean => {
  // 0 for Sunday, 6 for Saturday
  const dayOfWeek = entryDate.getDay();
  const lastDigit = parseInt(numberPlate.slice(-1));

  // Mon and Wed: even number in number plate gets 10% discount
  if ((dayOfWeek === 1 || dayOfWeek === 3) && lastDigit % 2 === 0) {
    return true;
  }
  // Tues and Thurs: odd number in number plate gets 10% discount
  if ((dayOfWeek === 2 || dayOfWeek === 4) && lastDigit % 2 !== 0) {
    return true;
  }
  // Fri/Sat/Sun: no discount
  return false;
};