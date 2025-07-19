import { isValidNumberPlate, calculateDistance, isWeekend, isNationalHoliday, appliesNumberPlateDiscount } from '../functions';
import { interchanges, nationalHolidays } from '../config';

describe('functions.ts', () => {
  describe('isValidNumberPlate', () => {
    it('should return true for valid number plates', () => {
      expect(isValidNumberPlate('ABC-123')).toBe(true);
      expect(isValidNumberPlate('XYZ-999')).toBe(true);
    });
    it('should return false for invalid number plates', () => {
      expect(isValidNumberPlate('abc-123')).toBe(false);
      expect(isValidNumberPlate('ABCD-123')).toBe(false);
      expect(isValidNumberPlate('ABC-12')).toBe(false);
      expect(isValidNumberPlate('123-ABC')).toBe(false);
      expect(isValidNumberPlate('A1C-123')).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate the correct distance between two interchanges', () => {
      expect(calculateDistance('NS Interchange', 'Bahria Interchange')).toBe(Math.abs(interchanges['NS Interchange'] - interchanges['Bahria Interchange']));
    });
    it('should throw an error for invalid interchange names', () => {
      expect(() => calculateDistance('Invalid', 'Bahria Interchange')).toThrow('Invalid interchange name(s) provided.');
      expect(() => calculateDistance('NS Interchange', 'Invalid')).toThrow('Invalid interchange name(s) provided.');
    });
  });

  describe('isWeekend', () => {
    it('should return true for Saturday and Sunday', () => {
      expect(isWeekend(new Date('2023-10-21'))).toBe(true); // Saturday
      expect(isWeekend(new Date('2023-10-22'))).toBe(true); // Sunday
    });
    it('should return false for weekdays', () => {
      expect(isWeekend(new Date('2023-10-23'))).toBe(false); // Monday
      expect(isWeekend(new Date('2023-10-24'))).toBe(false); // Tuesday
      expect(isWeekend(new Date('2023-10-25'))).toBe(false); // Wednesday
      expect(isWeekend(new Date('2023-10-26'))).toBe(false); // Thursday
      expect(isWeekend(new Date('2023-10-27'))).toBe(false); // Friday
    });
  });

  describe('isNationalHoliday', () => {
    it('should return true for a configured national holiday', () => {
      for (const holiday of nationalHolidays) {
        const [month, day] = holiday.split('-');
        const date = new Date(`2023-${month}-${day}`);
        expect(isNationalHoliday(date)).toBe(true);
      }
    });
    it('should return false for a non-holiday', () => {
      expect(isNationalHoliday(new Date('2023-01-01'))).toBe(false);
      expect(isNationalHoliday(new Date('2023-07-04'))).toBe(false);
    });
  });

  describe('appliesNumberPlateDiscount', () => {
    it('should return true for even number plate on Monday', () => {
      expect(appliesNumberPlateDiscount('ABC-124', new Date('2023-10-23'))).toBe(true); // Monday
    });
    it('should return true for even number plate on Wednesday', () => {
      expect(appliesNumberPlateDiscount('ABC-124', new Date('2023-10-25'))).toBe(true); // Wednesday
    });
    it('should return true for odd number plate on Tuesday', () => {
      expect(appliesNumberPlateDiscount('ABC-123', new Date('2023-10-24'))).toBe(true); // Tuesday
    });
    it('should return true for odd number plate on Thursday', () => {
      expect(appliesNumberPlateDiscount('ABC-123', new Date('2023-10-26'))).toBe(true); // Thursday
    });
    it('should return false for even number plate on Tuesday', () => {
      expect(appliesNumberPlateDiscount('ABC-124', new Date('2023-10-24'))).toBe(false);
    });
    it('should return false for odd number plate on Monday', () => {
      expect(appliesNumberPlateDiscount('ABC-123', new Date('2023-10-23'))).toBe(false);
    });
    it('should return false for Friday, Saturday, Sunday', () => {
      expect(appliesNumberPlateDiscount('ABC-123', new Date('2023-10-27'))).toBe(false); // Friday
      expect(appliesNumberPlateDiscount('ABC-124', new Date('2023-10-28'))).toBe(false); // Saturday
      expect(appliesNumberPlateDiscount('ABC-123', new Date('2023-10-29'))).toBe(false); // Sunday
    });
  });
});