import request from 'supertest';
import express from 'express';
import { authRoutes } from '../authRoutes';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { interchanges } from '../config';

describe('authRoutes', () => {
  let app: express.Application;
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      query: jest.fn()
    };
    app = express();
    app.use(express.json());
    // Attach the auth routes
    app.use('/api/auth', authRoutes(mockPool));
  });

  describe('POST /api/auth/register', () => {
    it('should register a user successfully', async () => {
      mockPool.query.mockResolvedValueOnce({});
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'agent1', password: 'secret', interchange: 'NS Interchange' });
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('User registered successfully.');
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'agent1', password: 'secret' });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/required/);
    });

    it('should return 400 for invalid interchange', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'agent1', password: 'secret', interchange: 'Invalid' });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Invalid interchange/);
    });

    it('should return 409 for duplicate username', async () => {
      const error = new Error();
      (error as any).code = '23505';
      mockPool.query.mockRejectedValueOnce(error);
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'agent1', password: 'secret', interchange: 'NS Interchange' });
      expect(res.statusCode).toBe(409);
      expect(res.body.message).toMatch(/already exists/);
    });

    it('should return 500 for other errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'agent1', password: 'secret', interchange: 'NS Interchange' });
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toMatch(/Internal server error/);
    });
  });

  describe('POST /api/auth/login', () => {
    const password = 'secret';
    const passwordHash = bcrypt.hashSync(password, 10);
    const user = { username: 'agent1', password: passwordHash, interchange: 'NS Interchange' };

    it('should login successfully and set cookie', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [user] });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'agent1', password });
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.interchange).toBe('NS Interchange');
      expect(res.headers['set-cookie']).toBeDefined();
      // Check JWT in cookie
      const cookie = res.headers['set-cookie'][0];
      const token = cookie.split('token=')[1].split(';')[0];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
      expect((decoded as any).username).toBe('agent1');
      expect((decoded as any).interchange).toBe('NS Interchange');
    });

    it('should login with provided interchange', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [user] });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'agent1', password, interchange: 'Bahria Interchange' });
      expect(res.statusCode).toBe(200);
      expect(res.body.interchange).toBe('Bahria Interchange');
      const cookie = res.headers['set-cookie'][0];
      const token = cookie.split('token=')[1].split(';')[0];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
      expect((decoded as any).interchange).toBe('Bahria Interchange');
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'agent1' });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/required/);
    });

    it('should return 400 for invalid interchange', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'agent1', password, interchange: 'Invalid' });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Invalid interchange/);
    });

    it('should return 401 for invalid username', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'notfound', password });
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Invalid username or password/);
    });

    it('should return 401 for invalid password', async () => {
      const badUser = { ...user, password: bcrypt.hashSync('wrong', 10) };
      mockPool.query.mockResolvedValueOnce({ rows: [badUser] });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'agent1', password });
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Invalid username or password/);
    });

    it('should return 500 for other errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'agent1', password });
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toMatch(/Internal server error/);
    });
  });
});