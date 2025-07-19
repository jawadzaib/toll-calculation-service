import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { BASE_RATE, interchanges, NATIONAL_HOLIDAY_DISCOUNT, NUMB_PLATE_DISCOUNT, PER_KM_RATE } from './config';
import { appliesNumberPlateDiscount, calculateDistance, isNationalHoliday, isValidNumberPlate, isWeekend } from './functions';
import { EntryRequest, ExitRequest, ExitResponse, VehicleEntry } from './types';
import { authenticate } from './middleware/authenticate';

export const tollRoutes = (pool: Pool): Router => {
  const app: Router = Router();

  // Public: List all available interchanges
  app.get('/interchanges', (req: Request, res: Response) => {
    const interchangeList = Object.entries(interchanges).map(([name, distance]) => ({ name, distance }));
    return res.status(200).json(interchangeList);
  });

  // Protect the following routes with JWT
  app.use(authenticate);

  /**
   * Add vehicle entry
   */
  app.post('/entry', async (req: Request<{}, {}, EntryRequest> & { user?: any }, res: Response) => {
    let { interchange, numberPlate, dateTime } = req.body;
    if (!interchange && req.user && req.user.interchange) {
      interchange = req.user.interchange;
    }
    if (!interchange || !numberPlate) {
      return res.status(400).json({ message: 'Interchange and Number Plate are required.' });
    }
    if (!Object.keys(interchanges).includes(interchange)) {
      return res.status(400).json({ message: `Invalid entry interchange: ${interchange}.` });
    }
    if (!isValidNumberPlate(numberPlate)) {
      return res.status(400).json({ message: 'Invalid number plate format. Expected LLL-NNN.' });
    }
    const entryDateTime = dateTime ? new Date(dateTime) : new Date();
    try {
      const existingEntry = await pool.query('SELECT * FROM vehicle_entries WHERE number_plate = $1', [numberPlate]);
      if (existingEntry.rows.length > 0) {
        return res.status(409).json({ message: `Vehicle with number plate ${numberPlate} is already entered.` });
      }
      const newEntryId = uuidv4();
      const insertQuery = `
        INSERT INTO vehicle_entries (id, number_plate, entry_interchange, entry_date_time)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const result = await pool.query(insertQuery, [newEntryId, numberPlate, interchange, entryDateTime]);
      const newEntry = result.rows[0];
      console.log(`Vehicle entered: ${JSON.stringify(newEntry)}`);
      return res.status(201).json({ message: 'Vehicle entry recorded successfully.', entry: newEntry });
    } catch (error: any) {
      console.error('Error recording vehicle entry:', error.message);
      if (error.code === '23505') {
        return res.status(409).json({ message: `A vehicle with number plate ${numberPlate} is already entered.` });
      }
      return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
  });

  /**
   * Calculate toll on vehicle exit
   */
  app.post('/exit', async (req: Request<{}, {}, ExitRequest> & { user?: any }, res: Response<ExitResponse | { message: string }>) => {
    let { interchange, numberPlate, dateTime } = req.body;
    if (!interchange && req.user && req.user.interchange) {
      interchange = req.user.interchange;
    }
    if (!interchange || !numberPlate) {
      return res.status(400).json({ message: 'Interchange and Number Plate are required.' });
    }
    if (!Object.keys(interchanges).includes(interchange)) {
      return res.status(400).json({ message: `Invalid exit interchange: ${interchange}.` });
    }
    if (!isValidNumberPlate(numberPlate)) {
      return res.status(400).json({ message: 'Invalid number plate format. Expected LLL-NNN.' });
    }
    try {
      const result = await pool.query('SELECT * FROM vehicle_entries WHERE number_plate = $1', [numberPlate]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: `No entry record found for number plate: ${numberPlate}.` });
      }
      const entry: VehicleEntry = result.rows[0];
      const exitDateTime = dateTime ? new Date(dateTime) : new Date();
      const entryDateTime = new Date(entry.entry_date_time);
      if (exitDateTime.getTime() < entryDateTime.getTime()) {
        return res.status(400).json({ message: 'Exit date/time cannot be before entry date/time.' });
      }
      let baseRate = BASE_RATE;
      let distanceCost = 0;
      let subTotal = 0;
      let discount = 0;
      let totalCharged = 0;
      let distanceBreakdown = '';
      const distance = calculateDistance(entry.entry_interchange, interchange);
      let currentPerKmRate = PER_KM_RATE;
      if (isWeekend(exitDateTime)) {
        currentPerKmRate *= 1.5;
      }
      distanceCost = distance * currentPerKmRate;
      distanceBreakdown = `Distance: ${distance}KM, Rate: ${currentPerKmRate.toFixed(1)}/KM`;
      subTotal = baseRate + distanceCost;
      if (isNationalHoliday(exitDateTime)) {
        discount += subTotal * NATIONAL_HOLIDAY_DISCOUNT;
      } else {
        if (appliesNumberPlateDiscount(numberPlate, entryDateTime)) {
          discount += subTotal * NUMB_PLATE_DISCOUNT;
        }
      }
      discount = Math.min(discount, subTotal);
      totalCharged = subTotal - discount;
      await pool.query('DELETE FROM vehicle_entries WHERE id = $1', [entry.id]);
      console.log(`Toll calculated for ${numberPlate}: ${totalCharged}`);
      return res.status(200).json({
        baseRate: parseFloat(baseRate.toFixed(2)),
        distanceCost: parseFloat(distanceCost.toFixed(2)),
        distanceBreakdown,
        subTotal: parseFloat(subTotal.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        totalCharged: parseFloat(totalCharged.toFixed(2)),
        message: 'Toll calculated successfully.',
      });
    } catch (error: any) {
      console.error('Error calculating toll:', error.message);
      return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
  });

  return app;
};
