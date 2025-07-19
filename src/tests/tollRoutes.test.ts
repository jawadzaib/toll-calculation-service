import request from 'supertest';
import express from 'express';
import { Pool, QueryResult } from 'pg';
import { tollRoutes } from '../tollRoutes';
import { VehicleEntry } from '../types';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

const userPayload = { username: 'agent1', interchange: 'NS Interchange' };
const validToken = 'valid.jwt.token';

type MockedPool = {
  query: jest.MockedFunction<(sql: string, params?: any[]) => Promise<QueryResult<VehicleEntry>>>;
};

const mockPool: MockedPool = {
  query: jest.fn(),
};

// mock QueryResult function
const createQueryResult = (rows: any[], rowCountOverride?: number): QueryResult<any> => {
  return {
    rows,
    rowCount: rowCountOverride !== undefined ? rowCountOverride : rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
};

describe('Toll Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    mockPool.query.mockReset();
    mockedJwt.verify.mockReset();
    // Default: always return a valid user for JWT
    mockedJwt.verify.mockReturnValue(userPayload as any);

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api', tollRoutes(mockPool as unknown as Pool));
  });

  describe('Authentication', () => {
    it('should return 401 if no token is provided for /api/entry', async () => {
      const res = await request(app).post('/api/entry').send({ numberPlate: 'ABC-123' });
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Authorization/);
    });
    it('should return 401 if invalid token is provided for /api/entry', async () => {
      mockedJwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });
      const res = await request(app)
        .post('/api/entry')
        .set('Authorization', 'Bearer invalidtoken')
        .send({ numberPlate: 'ABC-123' });
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Invalid or expired token/);
    });
    it('should allow valid JWT in Authorization header', async () => {
      mockedJwt.verify.mockReturnValue(userPayload as any);
      mockPool.query.mockResolvedValueOnce(createQueryResult([]));
      mockPool.query.mockResolvedValueOnce(createQueryResult([
        {
          id: 'mock-uuid-1',
          number_plate: 'ABC-123',
          entry_interchange: 'NS Interchange',
          entry_date_time: new Date(),
        },
      ]));
      const res = await request(app)
        .post('/api/entry')
        .set('Authorization', 'Bearer ' + validToken)
        .send({ numberPlate: 'ABC-123' });
      expect(res.statusCode).toBe(201);
      expect(res.body.entry.entry_interchange).toBe('NS Interchange');
    });
    it('should allow valid JWT in cookie', async () => {
      mockedJwt.verify.mockReturnValue(userPayload as any);
      mockPool.query.mockResolvedValueOnce(createQueryResult([]));
      mockPool.query.mockResolvedValueOnce(createQueryResult([
        {
          id: 'mock-uuid-1',
          number_plate: 'ABC-123',
          entry_interchange: 'NS Interchange',
          entry_date_time: new Date(),
        },
      ]));
      const res = await request(app)
        .post('/api/entry')
        .set('Cookie', [`token=${validToken}`])
        .send({ numberPlate: 'ABC-123' });
      expect(res.statusCode).toBe(201);
      expect(res.body.entry.entry_interchange).toBe('NS Interchange');
    });
  });

  describe('Default interchange from JWT', () => {
    it('should use user interchange from JWT if not provided in entry', async () => {
      mockedJwt.verify.mockReturnValue(userPayload as any);
      mockPool.query.mockResolvedValueOnce(createQueryResult([]));
      mockPool.query.mockResolvedValueOnce(createQueryResult([
        {
          id: 'mock-uuid-1',
          number_plate: 'ABC-123',
          entry_interchange: 'NS Interchange',
          entry_date_time: new Date(),
        },
      ]));
      const res = await request(app)
        .post('/api/entry')
        .set('Authorization', 'Bearer ' + validToken)
        .send({ numberPlate: 'ABC-123' });
      expect(res.statusCode).toBe(201);
      expect(res.body.entry.entry_interchange).toBe('NS Interchange');
    });
    it('should use request body interchange if provided (overrides JWT)', async () => {
      mockedJwt.verify.mockReturnValue(userPayload as any);
      mockPool.query.mockResolvedValueOnce(createQueryResult([]));
      mockPool.query.mockResolvedValueOnce(createQueryResult([
        {
          id: 'mock-uuid-1',
          number_plate: 'ABC-123',
          entry_interchange: 'Bahria Interchange',
          entry_date_time: new Date(),
        },
      ]));
      const res = await request(app)
        .post('/api/entry')
        .set('Authorization', 'Bearer ' + validToken)
        .send({ numberPlate: 'ABC-123', interchange: 'Bahria Interchange' });
      expect(res.statusCode).toBe(201);
      expect(res.body.entry.entry_interchange).toBe('Bahria Interchange');
    });
  });

  describe('GET /api/interchanges', () => {
    it('should return list of interchanges successfully', async () => {

      const res = await request(app)
        .get('/api/interchanges')
        .send();

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual([
        { name: 'Zero point', distance: 0 },
        { name: 'NS Interchange', distance: 5 },
        { name: 'Ph4 Interchange', distance: 10 },
        { name: 'Ferozpur Interchange', distance: 17 },
        { name: 'Lake City Interchange', distance: 24 },
        { name: 'Raiwand Interchange', distance: 29 },
        { name: 'Bahria Interchange', distance: 34 }
      ]);
    });
  });

  describe('POST /api/entry', () => {
    it('should record a new vehicle entry successfully', async () => {
      mockPool.query.mockResolvedValueOnce(createQueryResult([]));
      mockPool.query.mockResolvedValueOnce(createQueryResult([
        {
          id: 'mock-uuid-1',
          number_plate: 'ABC-123',
          entry_interchange: 'NS Interchange',
          entry_date_time: new Date(),
        },
      ]));

      const payload = {
        interchange: 'NS Interchange',
        numberPlate: 'ABC-123',
      };

      const res = await request(app)
        .post('/api/entry')
        .set('Authorization', 'Bearer ' + validToken)
        .send(payload);

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toEqual('Vehicle entry recorded successfully.');
      expect(res.body.entry).toHaveProperty('id');
      expect(res.body.entry.number_plate).toEqual(payload.numberPlate);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM vehicle_entries WHERE number_plate = $1',
        [payload.numberPlate]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vehicle_entries'),
        expect.arrayContaining([
          expect.any(String),
          payload.numberPlate,
          payload.interchange,
          expect.any(Date)
        ])
      );
    });

    it('should return 409 if vehicle with number plate is already entered', async () => {
      mockPool.query.mockResolvedValueOnce(createQueryResult([
        {
          id: 'existing-uuid',
          number_plate: 'ABC-123',
          entry_interchange: 'NS Interchange',
          entry_date_time: new Date(),
        },
      ]));

      const payload = {
        interchange: 'NS Interchange',
        numberPlate: 'ABC-123',
      };

      const res = await request(app)
        .post('/api/entry')
        .set('Authorization', 'Bearer ' + validToken)
        .send(payload);

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toEqual(`Vehicle with number plate ${payload.numberPlate} is already entered.`);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid number plate format', async () => {
      const payload = {
        interchange: 'NS Interchange',
        numberPlate: 'INVALID',
      };

      const res = await request(app)
        .post('/api/entry')
        .set('Authorization', 'Bearer ' + validToken)
        .send(payload);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Invalid number plate format. Expected LLL-NNN.');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should return 400 for missing interchange or numberPlate', async () => {
      // Mock JWT to return user with no interchange
      mockedJwt.verify.mockReturnValue({ username: 'agent1' } as any);
      const res1 = await request(app).post('/api/entry').set('Authorization', 'Bearer ' + validToken).send({ numberPlate: 'ABC-123' });
      expect(res1.statusCode).toEqual(400);
      expect(res1.body.message).toEqual('Interchange and Number Plate are required.');

      const res2 = await request(app).post('/api/entry').set('Authorization', 'Bearer ' + validToken).send({ interchange: 'NS Interchange' });
      expect(res2.statusCode).toEqual(400);
      expect(res2.body.message).toEqual('Interchange and Number Plate are required.');
    });

    it('should return 400 for invalid interchange name', async () => {
      const payload = {
        interchange: 'Invalid Interchange',
        numberPlate: 'ABC-123',
      };

      const res = await request(app)
        .post('/api/entry')
        .set('Authorization', 'Bearer ' + validToken)
        .send(payload);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual(`Invalid entry interchange: ${payload.interchange}.`);
    });

    it('should return 500 if a generic error occurs in /api/entry', async () => {
      mockPool.query.mockImplementationOnce(() => { throw new Error('DB failure'); });
      const payload = {
        interchange: 'NS Interchange',
        numberPlate: 'ABC-123',
      };
      const res = await request(app)
        .post('/api/entry')
        .set('Authorization', 'Bearer ' + validToken)
        .send(payload);
      expect(res.statusCode).toEqual(500);
      expect(res.body.message).toMatch(/Internal server error: DB failure/);
    });
  });

  describe('POST /api/exit', () => {
    const mockEntry: VehicleEntry = {
      id: 'entry-id-1',
      number_plate: 'ABC-123',
      entry_interchange: 'NS Interchange',
      entry_date_time: new Date('2023-10-26T10:00:00Z'),
    };

    it('should calculate toll successfully with no discount', async () => {
      const noDiscountEntry: VehicleEntry = {
        id: 'entry-id-1',
        number_plate: 'ABC-124',
        entry_interchange: 'NS Interchange',
        entry_date_time: new Date('2023-10-26T10:00:00Z'),
      };
      mockPool.query.mockResolvedValueOnce(createQueryResult([noDiscountEntry]));
      mockPool.query.mockResolvedValueOnce(createQueryResult([], 1));

      const payload = {
        interchange: 'Bahria Interchange',
        numberPlate: 'ABC-124',
        dateTime: '2023-10-26T11:00:00Z',
      };

      const res = await request(app)
        .post('/api/exit')
        .set('Authorization', 'Bearer ' + validToken)
        .send(payload);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Toll calculated successfully.');
      expect(res.body.baseRate).toEqual(20);
      // Distance from NS (5KM) to Bahria (34KM) = 29KM
      // 29KM * 0.2/KM = 5.8
      expect(res.body.distanceCost).toEqual(5.8);
      expect(res.body.distanceBreakdown).toEqual('Distance: 29KM, Rate: 0.2/KM');
      expect(res.body.subTotal).toEqual(25.8);
      expect(res.body.discount).toEqual(0);
      expect(res.body.totalCharged).toEqual(25.8);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM vehicle_entries WHERE number_plate = $1',
        [payload.numberPlate]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM vehicle_entries WHERE id = $1',
        [noDiscountEntry.id]
      );
    });

    it('should apply 1.5x distance rate on weekend exit', async () => {
      const weekendEntry: VehicleEntry = {
        ...mockEntry,
        entry_date_time: new Date('2023-10-27T10:00:00Z'),
      };
      mockPool.query.mockResolvedValueOnce(createQueryResult([weekendEntry]));
      mockPool.query.mockResolvedValueOnce(createQueryResult([], 1));

      const payload = {
        interchange: 'Bahria Interchange',
        numberPlate: 'ABC-123',
        dateTime: '2023-10-28T11:00:00Z',
      };

      const res = await request(app)
        .post('/api/exit')
        .set('Authorization', 'Bearer ' + validToken)
        .send(payload);

      expect(res.statusCode).toEqual(200);
      // Distance from NS (5KM) to Bahria (34KM) = 29KM
      // 29KM * (0.2 * 1.5)/KM = 29 * 0.3 = 8.7
      expect(res.body.distanceCost).toEqual(8.7);
      expect(res.body.distanceBreakdown).toEqual('Distance: 29KM, Rate: 0.3/KM');
      expect(res.body.subTotal).toEqual(28.7);
      expect(res.body.discount).toEqual(0);
      expect(res.body.totalCharged).toEqual(28.7);
    });

    it('should apply 10% number plate discount on Tuesday (odd number plate)', async () => {
      const oddPlateEntry: VehicleEntry = {
        ...mockEntry,
        number_plate: 'XYZ-451',
        entry_date_time: new Date('2023-10-24T10:00:00Z'),
      };
      mockPool.query.mockResolvedValueOnce(createQueryResult([oddPlateEntry]));
      mockPool.query.mockResolvedValueOnce(createQueryResult([], 1));

      const payload = {
        interchange: 'Bahria Interchange',
        numberPlate: 'XYZ-451',
        dateTime: '2023-10-24T11:00:00Z',
      };

      const res = await request(app)
        .post('/api/exit')
        .set('Authorization', 'Bearer ' + validToken)
        .send(payload);

      expect(res.statusCode).toEqual(200);
      const expectedSubTotal = 20 + (29 * 0.2);
      const expectedDiscount = expectedSubTotal * 0.10;
      const expectedTotal = expectedSubTotal - expectedDiscount;

      expect(res.body.subTotal).toEqual(parseFloat(expectedSubTotal.toFixed(2)));
      expect(res.body.discount).toEqual(parseFloat(expectedDiscount.toFixed(2)));
      expect(res.body.totalCharged).toEqual(parseFloat(expectedTotal.toFixed(2)));
    });

    it('should apply 50% national holiday discount and skip number plate discount', async () => {
      const holidayEntry: VehicleEntry = {
        ...mockEntry,
        number_plate: 'XYZ-450',
        entry_date_time: new Date('2023-03-23T09:00:00Z'),
      };
      mockPool.query.mockResolvedValueOnce(createQueryResult([holidayEntry]));
      mockPool.query.mockResolvedValueOnce(createQueryResult([], 1));

      const payload = {
        interchange: 'Bahria Interchange',
        numberPlate: 'XYZ-450',
        dateTime: '2023-03-23T10:00:00Z',
      };

      const res = await request(app)
        .post('/api/exit')
        .set('Authorization', 'Bearer ' + validToken)
        .send(payload);

      expect(res.statusCode).toEqual(200);
      const expectedSubTotal = 20 + (29 * 0.2);
      const expectedDiscount = expectedSubTotal * 0.50;
      const expectedTotal = expectedSubTotal - expectedDiscount;

      expect(res.body.subTotal).toEqual(parseFloat(expectedSubTotal.toFixed(2)));
      expect(res.body.discount).toEqual(parseFloat(expectedDiscount.toFixed(2)));
      expect(res.body.totalCharged).toEqual(parseFloat(expectedTotal.toFixed(2)));
      expect(res.body.discount).not.toEqual(expectedSubTotal * 0.10);
    });

    it('should return 404 if no entry record found', async () => {
      mockPool.query.mockResolvedValueOnce(createQueryResult([]));
      const payload = {
        interchange: 'Bahria Interchange',
        numberPlate: 'ABC-999',
        dateTime: '2023-10-26T11:00:00Z',
      };

      const res = await request(app)
        .post('/api/exit')
        .set('Authorization', 'Bearer ' + validToken)
        .send(payload);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual(`No entry record found for number plate: ${payload.numberPlate}.`);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should return 400 if exit date/time is before entry date/time', async () => {
      mockPool.query.mockResolvedValueOnce(createQueryResult([mockEntry]));

      const payload = {
        interchange: 'Bahria Interchange',
        numberPlate: 'ABC-123',
        dateTime: '2023-10-26T09:00:00Z',
      };

      const res = await request(app)
        .post('/api/exit')
        .set('Authorization', 'Bearer ' + validToken)
        .send(payload);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Exit date/time cannot be before entry date/time.');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid number plate format on exit', async () => {
      const payload = {
        interchange: 'Bahria Interchange',
        numberPlate: 'INVALID',
      };

      const res = await request(app)
        .post('/api/exit')
        .set('Authorization', 'Bearer ' + validToken)
        .send(payload);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Invalid number plate format. Expected LLL-NNN.');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should return 400 for missing interchange or numberPlate on exit', async () => {
      // Mock JWT to return user with no interchange
      mockedJwt.verify.mockReturnValue({ username: 'agent1' } as any);
      const res1 = await request(app).post('/api/exit').set('Authorization', 'Bearer ' + validToken).send({ numberPlate: 'ABC-123' });
      expect(res1.statusCode).toEqual(400);
      expect(res1.body.message).toEqual('Interchange and Number Plate are required.');

      const res2 = await request(app).post('/api/exit').set('Authorization', 'Bearer ' + validToken).send({ interchange: 'Bahria Interchange' });
      expect(res2.statusCode).toEqual(400);
      expect(res2.body.message).toEqual('Interchange and Number Plate are required.');
    });

    it('should return 400 for invalid exit interchange name', async () => {
      mockPool.query.mockResolvedValueOnce(createQueryResult([mockEntry]));

      const payload = {
        interchange: 'Invalid Exit Interchange',
        numberPlate: 'ABC-123',
      };

      const res = await request(app)
        .post('/api/exit')
        .set('Authorization', 'Bearer ' + validToken)
        .send(payload);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual(`Invalid exit interchange: ${payload.interchange}.`);
      expect(mockPool.query).toHaveBeenCalledTimes(0);
    });

    it('should return 500 if a generic error occurs in /api/exit', async () => {
      mockPool.query.mockImplementationOnce(() => { throw new Error('DB failure'); });
      const payload = {
        interchange: 'Bahria Interchange',
        numberPlate: 'ABC-123',
      };
      const res = await request(app)
        .post('/api/exit')
        .set('Authorization', 'Bearer ' + validToken)
        .send(payload);
      expect(res.statusCode).toEqual(500);
      expect(res.body.message).toMatch(/Internal server error: DB failure/);
    });
  });
});
