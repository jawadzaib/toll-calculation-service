
// Map of interchanges and their distances from the zero point (in KM)
export const interchanges: { [key: string]: number } = {
  'Zero point': 0,
  'NS Interchange': 5,
  'Ph4 Interchange': 10,
  'Ferozpur Interchange': 17,
  'Lake City Interchange': 24,
  'Raiwand Interchange': 29,
  'Bahria Interchange': 34,
};

// National holidays
export const nationalHolidays: string[] = [
  '03-23',
  '08-14',
  '12-25',
];

// --- Constants ---
export const BASE_RATE = 20; // Base toll rate
export const PER_KM_RATE = 0.2; // Rate per KM
export const NUMB_PLATE_DISCOUNT = 0.10; // 10%
export const NATIONAL_HOLIDAY_DISCOUNT = 0.50; // 50%